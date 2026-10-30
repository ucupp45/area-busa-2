const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// Service Layer Imports (Separation of Concerns: Controller-Service-Repository)
const { parseSPKExcel } = require('../services/excelParserService');
const {
    getExistingWOs,
    extractWOsFromItem,
    checkWODuplication,
    getActiveWOsList
} = require('../services/woService');
const {
    findMatchedCT,
    calculateCapacityAndManpower,
    matchAndCalculate,
    calculateSummaryDetails,
    calculateOEEScores,
    recalculatePreviewData
} = require('../services/spkCalculationService');

// ============================================================
// CONTROLLER: CHECK SINGLE WO DUPLICATION
// ============================================================
exports.checkWO = async (req, res) => {
    try {
        const { noWo, excludeHistoryId } = req.query;
        const result = await checkWODuplication(noWo, excludeHistoryId);
        return res.json(result);
    } catch (error) {
        console.error('[ERROR] checkWO:', error);
        res.status(500).json({ success: false, message: 'Gagal memeriksa nomor WO.' });
    }
};

// ============================================================
// CONTROLLER: AMBIL CYCLE TIME BERDASARKAN NAMA ITEM
// ============================================================
exports.getCT = async (req, res) => {
    try {
        const { item } = req.body;
        if (!item) return res.json({ ct: 0 });

        const [matrixData] = await db.query('SELECT id, nama_item, cycle_time_menit FROM cycle_time_matrix');
        const sortedMatrix = [...matrixData].sort((a, b) => b.nama_item.length - a.nama_item.length);
        const cleanItemName = item.replace(/\s*\([\d.x]+\)\s*$/, '').trim();

        const ct = findMatchedCT(cleanItemName, sortedMatrix);
        res.json({ ct });
    } catch (error) {
        console.error('[ERROR] getCT:', error);
        res.status(500).json({ ct: 0 });
    }
};

// ============================================================
// CONTROLLER: PREVIEW RAW DATA (Copas dari Excel)
// ============================================================
exports.previewRaw = async (req, res) => {
    try {
        const { rawRows, editingHistoryId } = req.body;
        if (!rawRows || !Array.isArray(rawRows)) {
            return res.status(400).json({ message: 'Data row tidak valid.' });
        }

        const [manpowerRows] = await db.query('SELECT * FROM mesin_manpower');
        const manpowerMap = {};
        for (const row of manpowerRows) {
            manpowerMap[row.tipe_mesin] = row;
        }

        const existingWOMap = await getExistingWOs(editingHistoryId ? Number(editingHistoryId) : null);
        const { parsedData, totalEstimasiWaktu, summaryPerMesin, duplicateWOs } = await matchAndCalculate(rawRows, existingWOMap);

        const calculatedSummary = calculateCapacityAndManpower(summaryPerMesin, manpowerMap);

        res.json({
            parsedData,
            summaryPerMesin: calculatedSummary,
            totalEstimasiWaktu,
            duplicateWOs: duplicateWOs || [],
            hasDuplicates: duplicateWOs && duplicateWOs.length > 0
        });

    } catch (error) {
        console.error('[ERROR] previewRaw:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memproses data paste.' });
    }
};

// ============================================================
// CONTROLLER: PREVIEW SPK (Excel)
// ============================================================
exports.previewSPK = async (req, res) => {
    const filePath = req.file ? req.file.path : null;

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File SPK tidak ditemukan.' });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        let rawRows = [];
        let parsedShift = 1;

        if (ext === '.xlsx' || ext === '.xls') {
            const parsedRes = await parseSPKExcel(filePath);
            rawRows = parsedRes.rows;
            parsedShift = parsedRes.shift;
        } else {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Format file tidak didukung. Gunakan .xls/.xlsx' });
        }

        if (rawRows.length === 0) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({
                message: `File berhasil dibaca, namun tidak ada data item yang dapat diekstrak.`
            });
        }

        const [manpowerRows] = await db.query('SELECT * FROM mesin_manpower');
        const manpowerMap = {};
        for (const row of manpowerRows) {
            manpowerMap[row.tipe_mesin] = row;
        }

        const editingHistoryId = req.body.editingHistoryId ? Number(req.body.editingHistoryId) : null;
        const existingWOMap = await getExistingWOs(editingHistoryId);
        const { parsedData, totalEstimasiWaktu, summaryPerMesin, duplicateWOs } = await matchAndCalculate(rawRows, existingWOMap);

        const calculatedSummary = calculateCapacityAndManpower(summaryPerMesin, manpowerMap);

        // Ambil mesin yang tersedia (tidak Maintenance)
        const today = new Date().toISOString().slice(0, 10);
        const hour = new Date().getHours();
        const shift = hour >= 7 && hour < 15 ? 1 : hour >= 15 && hour < 23 ? 2 : 3;

        const [healthRows] = await db.query(
            `SELECT mesin_id, status, oee, availability, performance_eff, quality_rate
             FROM machine_health WHERE tanggal = ? AND shift = ? ORDER BY mesin_id`,
            [today, shift]
        );

        const mesinAvailable = healthRows.filter(r => r.status !== 'Maintenance');
        const mesinMaintenance = healthRows.filter(r => r.status === 'Maintenance');

        const [timeResult] = await db.query(
            `SELECT SUM(s.estimasi_waktu_menit) as total_waktu 
             FROM spk_items s
             JOIN upload_history h ON s.history_id = h.id
             WHERE DATE(h.tanggal_upload) = ?`,
            [today]
        );
        const existingWaktu = Number(timeResult[0].total_waktu) || 0;
        const kapasitasPerMesin = 420;

        const startIndex = Math.floor(existingWaktu / kapasitasPerMesin);
        const endIndex = totalEstimasiWaktu > 0
            ? Math.floor((existingWaktu + totalEstimasiWaktu - 0.1) / kapasitasPerMesin)
            : startIndex;

        let mesinTerpilih = [];
        if (mesinAvailable.length > 0) {
            mesinAvailable.sort((a, b) => a.mesin_id.localeCompare(b.mesin_id));
            for (let i = startIndex; i <= endIndex; i++) {
                const m = mesinAvailable[i % mesinAvailable.length];
                if (!mesinTerpilih.includes(m.mesin_id)) {
                    mesinTerpilih.push(m.mesin_id);
                }
            }
        }

        const mesinDibutuhkan = mesinTerpilih.length || 0;

        const persentaseUtilisasi = mesinDibutuhkan > 0
            ? (totalEstimasiWaktu / (mesinDibutuhkan * kapasitasPerMesin)) * 100
            : 0;
        let utilisasiStatus = 'Efisien';
        if (persentaseUtilisasi < 50) utilisasiStatus = 'Tidak Efisien';
        else if (persentaseUtilisasi < 80) utilisasiStatus = 'Cukup';

        res.json({
            fileName: req.file.originalname,
            savedFileName: req.file.filename,
            shift: parsedShift,
            fileType: 'Excel',
            totalEstimasiWaktu,
            mesinDibutuhkan,
            manpowerDibutuhkan: mesinDibutuhkan * 4,
            utilisasiStatus,
            parsedData,
            summaryPerMesin: calculatedSummary,
            mesinTerpilih,
            existingWaktu,
            mesinAvailable: mesinAvailable.map(m => ({ id: m.mesin_id, status: m.status, oee: m.oee })),
            mesinMaintenance: mesinMaintenance.map(m => m.mesin_id),
            totalMesinAvailable: mesinAvailable.length,
            duplicateWOs: duplicateWOs || [],
            hasDuplicates: duplicateWOs && duplicateWOs.length > 0
        });

    } catch (error) {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.error('[ERROR] previewSPK:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memproses SPK.' });
    }
};

// ============================================================
// CONTROLLER: SIMPAN & KUNCI SPK KE DATABASE
// ============================================================
exports.saveSPK = async (req, res) => {
    const { fileName, fileUnik, fileType, user, parsedData, mesinTerpilih, shift } = req.body;

    try {
        let shiftInt = 1;
        if (typeof shift === 'number') {
            shiftInt = shift;
        } else if (typeof shift === 'string') {
            const match = shift.match(/\d+/);
            if (match) {
                shiftInt = parseInt(match[0], 10);
            }
        }

        const typeFile = fileType || 'Manual';
        const unikFile = fileUnik || `manual-${Date.now()}`;
        const mesinJson = mesinTerpilih ? JSON.stringify(mesinTerpilih) : JSON.stringify([]);

        // Validasi Duplikasi Nomor WO (Server-Side Locking)
        const existingWOMap = await getExistingWOs(null);
        const duplicateList = [];
        if (parsedData && Array.isArray(parsedData)) {
            for (const item of parsedData) {
                const wos = extractWOsFromItem(item);
                for (const wo of wos) {
                    if (existingWOMap.has(wo)) {
                        duplicateList.push({
                            noWo: wo,
                            item: item.item,
                            existing: existingWOMap.get(wo)
                        });
                    }
                }
            }
        }

        if (duplicateList.length > 0) {
            const sample = duplicateList.slice(0, 3).map(d => `${d.noWo} (pada ${d.existing.fileName})`).join(', ');
            return res.status(400).json({
                message: `Gagal mengunci SPK: Ditemukan ${duplicateList.length} nomor WO yang sudah pernah diunggah sebelumnya (${sample}${duplicateList.length > 3 ? '...' : ''}). Untuk mencegah overproduksi, nomor WO ini tidak boleh diproses ganda.`,
                duplicateWOs: duplicateList
            });
        }

        // Promosikan file dari staging sementara (uploads/temp/) ke penyimpanan permanen (uploads/)
        let finalUnikFile = unikFile;
        if (fileUnik) {
            const safeFileUnik = path.basename(fileUnik);
            const tempFilePath = path.join(__dirname, '../uploads/temp', safeFileUnik);
            const permDir = path.join(__dirname, '../uploads');

            if (fs.existsSync(tempFilePath)) {
                const ext = path.extname(safeFileUnik) || '.xlsx';
                const permFileName = `spk-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
                const permFilePath = path.join(permDir, permFileName);
                try {
                    fs.renameSync(tempFilePath, permFilePath);
                    finalUnikFile = permFileName;
                } catch (moveErr) {
                    // Fallback copy & unlink jika cross-device link
                    fs.copyFileSync(tempFilePath, permFilePath);
                    fs.unlinkSync(tempFilePath);
                    finalUnikFile = permFileName;
                }
            } else {
                const existingPermPath = path.join(permDir, safeFileUnik);
                if (fs.existsSync(existingPermPath)) {
                    finalUnikFile = safeFileUnik;
                }
            }
        }

        // Ambil identitas pengguna terverifikasi dari token JWT
        const verifiedUser = (req.user && (req.user.name || req.user.username)) || 'System';

        const [historyResult] = await db.query(
            `INSERT INTO upload_history (nama_file, file_unik, tipe_file, diupload_oleh, total_item, status, mesin_digunakan, shift) 
             VALUES (?, ?, ?, ?, ?, 'Locked', ?, ?)`,
            [fileName || 'SPK_Manual', finalUnikFile, typeFile, verifiedUser, parsedData.length, mesinJson, shiftInt]
        );

        const historyId = historyResult.insertId;

        const itemsData = parsedData.map(item => [
            historyId,
            item.noWo || '-',
            item.customer || '-',
            item.item || '',
            item.qty || 0,
            item.waktu || 0,
            item.match ? 1 : 0,
            item.spkCutting || null,
            item.ukuranP || null,
            item.ukuranL || null,
            item.ukuranT || null,
            item.qtyCut || null,
            item.bahanBakuP || null,
            item.bahanBakuL || null,
            item.bahanBakuT || null,
            item.keterangan || null,
            item.mesinTujuan || null,
            item.tinggi_balokan || null,
            item.prediksi_sb || null,
            item.woDetails || null
        ]);

        if (itemsData.length > 0) {
            await db.query(
                `INSERT INTO spk_items (history_id, no_wo, customer, nama_item, qty, estimasi_waktu_menit, match_db, spk_cutting, ukuran_p, ukuran_l, ukuran_t, qty_cutting, bahan_baku_p, bahan_baku_l, bahan_baku_t, keterangan, tipe_mesin, tinggi_balokan, prediksi_sb, wo_details) 
                 VALUES ?`,
                [itemsData]
            );
        }

        // Catat jejak audit
        await logAudit(req, {
            action: 'CREATE_SPK',
            targetEntity: 'upload_history',
            targetId: historyId,
            details: {
                nama_file: fileName || 'SPK_Manual',
                file_unik: finalUnikFile,
                tipe_file: typeFile,
                diupload_oleh: verifiedUser,
                total_item: parsedData.length,
                shift: shiftInt
            }
        });

        res.json({ message: 'SPK berhasil dikunci dan disimpan ke database!', historyId });
    } catch (error) {
        console.error('[ERROR] saveSPK:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan SPK ke database.' });
    }
};

// ============================================================
// CONTROLLER: AMBIL HISTORY SPK
// ============================================================
exports.getHistory = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        let query = 'SELECT * FROM upload_history';
        let params = [];

        if (dateFrom && dateTo) {
            query += ' WHERE DATE(tanggal_upload) >= ? AND DATE(tanggal_upload) <= ?';
            params.push(dateFrom, dateTo);
        } else {
            query += ' WHERE DATE(tanggal_upload) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        }

        query += ' ORDER BY tanggal_upload DESC';
        const [history] = await db.query(query, params);
        res.json(history);
    } catch (error) {
        console.error('[ERROR] getHistory:', error);
        res.status(500).json({ message: 'Gagal mengambil data history' });
    }
};

// ============================================================
// CONTROLLER: AMBIL EXISTING WAKTU
// ============================================================
exports.getExistingWaktu = async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const [timeResult] = await db.query(
            `SELECT SUM(s.estimasi_waktu_menit) as total_waktu 
             FROM spk_items s
             JOIN upload_history h ON s.history_id = h.id
             WHERE DATE(h.tanggal_upload) = ?`,
            [today]
        );
        const existingWaktu = Number(timeResult[0].total_waktu) || 0;
        res.json({ existingWaktu });
    } catch (error) {
        console.error('[ERROR] getExistingWaktu:', error);
        res.status(500).json({ message: 'Gagal mengambil existing waktu', existingWaktu: 0 });
    }
};

// ============================================================
// CONTROLLER: AMBIL REKAP STOK
// ============================================================
exports.getRekapStok = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.nama_item, 
                MAX(c.varians) as varians, 
                SUM(s.qty) as total_qty, 
                MAX(h.tanggal_upload) as waktu_pemotongan
            FROM spk_items s
            LEFT JOIN cycle_time_matrix c ON c.nama_item = (
                SELECT c2.nama_item 
                FROM cycle_time_matrix c2 
                WHERE s.nama_item LIKE CONCAT('%', c2.nama_item, '%') 
                ORDER BY LENGTH(c2.nama_item) DESC 
                LIMIT 1
            )
            LEFT JOIN upload_history h ON s.history_id = h.id
            GROUP BY s.nama_item
            ORDER BY total_qty DESC
        `;
        const [result] = await db.query(query);
        res.json(result);
    } catch (error) {
        console.error('[ERROR] getRekapStok:', error);
        res.status(500).json({ message: 'Gagal mengambil data rekap stok' });
    }
};

// ============================================================
// CONTROLLER: AMBIL DATA EFISIENSI & ITEM UNTUK QUALITY LOG
// ============================================================
exports.getEfisiensi = async (req, res) => {
    try {
        const { date, startDate, endDate } = req.query;
        let dateCondition = "DATE(tanggal_upload) = CURDATE()";
        let queryParams = [];

        if (startDate && endDate) {
            dateCondition = "DATE(tanggal_upload) BETWEEN ? AND ?";
            queryParams.push(startDate, endDate);
        } else if (date) {
            dateCondition = "DATE(tanggal_upload) = ?";
            queryParams.push(date);
        }

        const [historyRows] = await db.query(
            `SELECT id, mesin_digunakan FROM upload_history 
             WHERE ${dateCondition} 
             ORDER BY id ASC`, queryParams
        );

        let totalWaktu = 0;
        let itemDetails = [];
        let waktuPerMesin = {};
        const lastHistoryId = historyRows.length > 0 ? historyRows[historyRows.length - 1].id : null;

        if (historyRows.length > 0) {
            historyRows.forEach(row => {
                if (row.mesin_digunakan) {
                    try {
                        const parsed = JSON.parse(row.mesin_digunakan);
                        for (const [tipe, data] of Object.entries(parsed)) {
                            if (!waktuPerMesin[tipe]) waktuPerMesin[tipe] = { waktu: 0, qty: 0 };
                            waktuPerMesin[tipe].waktu += Number(data.totalWaktu) || 0;
                            waktuPerMesin[tipe].qty += Number(data.totalQty) || 0;
                        }
                    } catch (e) {
                        console.error('Failed to parse mesin_digunakan', e);
                    }
                }
            });

            for (const data of Object.values(waktuPerMesin)) {
                totalWaktu += data.waktu;
            }

            const [itemResult] = await db.query(
                `SELECT s.nama_item, SUM(s.qty) as total_qty, SUM(s.prediksi_sb) as total_sb,
                        COALESCE(q.qty_ok, 0) as qty_ok, 
                        COALESCE(q.qty_ng, 0) as qty_ng, 
                        COALESCE(q.catatan, 'Menunggu Produksi') as catatan
                 FROM spk_items s
                 LEFT JOIN quality_logs q ON s.history_id = q.history_id AND s.nama_item = q.nama_item
                 WHERE s.history_id = ? 
                 GROUP BY s.nama_item, q.qty_ok, q.qty_ng, q.catatan`,
                [lastHistoryId]
            );
            itemDetails = itemResult;
        }

        res.json({ historyId: lastHistoryId, totalWaktu, itemDetails, waktuPerMesin: waktuPerMesin || {} });
    } catch (error) {
        console.error('[ERROR] getEfisiensi:', error);
        res.status(500).json({ message: 'Gagal mengambil data efisiensi' });
    }
};

// ============================================================
// CONTROLLER: SIMPAN/UPDATE LAPORAN KUALITAS FOAM (OK/NG)
// ============================================================
exports.updateQuality = async (req, res) => {
    const { history_id, nama_item, qty_ok, qty_ng, catatan } = req.body;
    try {
        const query = `
            INSERT INTO quality_logs (history_id, nama_item, qty_ok, qty_ng, catatan)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE qty_ok = ?, qty_ng = ?, catatan = ?
        `;
        await db.query(query, [history_id, nama_item, qty_ok, qty_ng, catatan, qty_ok, qty_ng, catatan]);
        res.json({ message: 'Laporan kualitas berhasil disimpan!' });
    } catch (error) {
        console.error('[ERROR] updateQuality:', error);
        res.status(500).json({ message: 'Gagal menyimpan laporan kualitas' });
    }
};

// ============================================================
// CONTROLLER: AMBIL DETAIL HISTORY SPK (Untuk Edit Demand)
// ============================================================
exports.getHistoryDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const [historyRows] = await db.query('SELECT * FROM upload_history WHERE id = ?', [id]);
        if (historyRows.length === 0) {
            return res.status(404).json({ message: 'Data history SPK tidak ditemukan' });
        }
        const history = historyRows[0];

        const [items] = await db.query('SELECT * FROM spk_items WHERE history_id = ? ORDER BY id ASC', [id]);

        const parsedData = items.map(item => {
            const qty = Number(item.qty) || 0;
            const waktu = Number(item.estimasi_waktu_menit) || 0;
            const sb = item.prediksi_sb !== null && item.prediksi_sb !== undefined ? Number(item.prediksi_sb) : null;
            let ct = 0;
            if (item.tipe_mesin === 'Vertikal' && sb && sb > 0) {
                ct = Number((waktu / sb).toFixed(2));
            } else if (qty > 0) {
                ct = Number((waktu / qty).toFixed(2));
            }

            let woDetails = null;
            if (item.wo_details) {
                try {
                    woDetails = typeof item.wo_details === 'string' ? JSON.parse(item.wo_details) : item.wo_details;
                } catch (e) {
                    woDetails = null;
                }
            }

            return {
                id: item.id,
                noWo: item.no_wo || '-',
                customer: item.customer || '-',
                item: item.nama_item || '',
                qty: qty,
                qtyBB: qty,
                qtyCut: item.qty_cutting !== null ? Number(item.qty_cutting) : qty,
                ukuranP: item.ukuran_p !== null ? Number(item.ukuran_p) : 0,
                ukuranL: item.ukuran_l !== null ? Number(item.ukuran_l) : 0,
                ukuranT: item.ukuran_t !== null ? Number(item.ukuran_t) : 0,
                bahanBakuP: item.bahan_baku_p !== null ? Number(item.bahan_baku_p) : (item.ukuran_p !== null ? Number(item.ukuran_p) : 0),
                bahanBakuL: item.bahan_baku_l !== null ? Number(item.bahan_baku_l) : (item.ukuran_l !== null ? Number(item.ukuran_l) : 0),
                bahanBakuT: item.bahan_baku_t !== null ? Number(item.bahan_baku_t) : (item.ukuran_t !== null ? Number(item.ukuran_t) : 0),
                keterangan: item.keterangan || '',
                ct: ct,
                waktu: waktu,
                mesinTujuan: item.tipe_mesin || 'Vertikal',
                prediksi_sb: sb,
                tinggi_balokan: item.tinggi_balokan !== null ? Number(item.tinggi_balokan) : null,
                match: Boolean(item.match_db),
                spkCutting: item.spk_cutting || '',
                woDetails: woDetails
            };
        });

        res.json({
            history,
            parsedData
        });
    } catch (error) {
        console.error('[ERROR] getHistoryDetail:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail data demand SPK.' });
    }
};

// ============================================================
// CONTROLLER: UPDATE NAMA FILE / DATA DEMAND SPK
// ============================================================
exports.updateSPK = async (req, res) => {
    const { id } = req.params;
    const { nama_file, fileName, shift, user, parsedData, mesinTerpilih } = req.body;
    try {
        const [existingRows] = await db.query('SELECT * FROM upload_history WHERE id = ?', [id]);
        if (!existingRows || existingRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data history SPK tidak ditemukan.' });
        }
        const existingSPK = existingRows[0];
        const finalName = fileName || nama_file;

        if (parsedData && Array.isArray(parsedData)) {
            // Pengecekan Locking WO Duplikasi (kecuali item milik history ini sendiri)
            const existingWOMap = await getExistingWOs(Number(id));
            const duplicateList = [];
            for (const item of parsedData) {
                const wos = extractWOsFromItem(item);
                for (const wo of wos) {
                    if (existingWOMap.has(wo)) {
                        duplicateList.push({
                            noWo: wo,
                            item: item.item,
                            existing: existingWOMap.get(wo)
                        });
                    }
                }
            }

            if (duplicateList.length > 0) {
                const sample = duplicateList.slice(0, 3).map(d => `${d.noWo} (pada ${d.existing.fileName})`).join(', ');
                return res.status(400).json({
                    message: `Gagal memperbarui SPK: Ditemukan ${duplicateList.length} nomor WO yang sudah pernah diunggah pada file lain (${sample}${duplicateList.length > 3 ? '...' : ''}).`,
                    duplicateWOs: duplicateList
                });
            }

            let shiftInt = 1;
            if (typeof shift === 'number') {
                shiftInt = shift;
            } else if (typeof shift === 'string') {
                const match = shift.match(/\d+/);
                if (match) shiftInt = parseInt(match[0], 10);
            }

            const mesinJson = mesinTerpilih ? JSON.stringify(mesinTerpilih) : null;

            // 1. Update data header upload_history
            await db.query(
                `UPDATE upload_history 
                 SET nama_file = ?, total_item = ?, mesin_digunakan = COALESCE(?, mesin_digunakan), shift = ?
                 WHERE id = ?`,
                [finalName, parsedData.length, mesinJson, shiftInt, id]
            );

            // 2. Hapus detail item lama
            await db.query('DELETE FROM spk_items WHERE history_id = ?', [id]);

            // 3. Masukkan item baru/update
            const itemsData = parsedData.map(item => [
                id,
                item.noWo || '-',
                item.customer || '-',
                item.item || '',
                item.qty || 0,
                item.waktu || 0,
                item.match ? 1 : 0,
                item.spkCutting || null,
                item.ukuranP || null,
                item.ukuranL || null,
                item.ukuranT || null,
                item.qtyCut || null,
                item.bahanBakuP || null,
                item.bahanBakuL || null,
                item.bahanBakuT || null,
                item.keterangan || null,
                item.mesinTujuan || null,
                item.tinggi_balokan || null,
                item.prediksi_sb || null,
                item.woDetails ? (typeof item.woDetails === 'object' ? JSON.stringify(item.woDetails) : item.woDetails) : null
            ]);

            if (itemsData.length > 0) {
                await db.query(
                    `INSERT INTO spk_items (history_id, no_wo, customer, nama_item, qty, estimasi_waktu_menit, match_db, spk_cutting, ukuran_p, ukuran_l, ukuran_t, qty_cutting, bahan_baku_p, bahan_baku_l, bahan_baku_t, keterangan, tipe_mesin, tinggi_balokan, prediksi_sb, wo_details) 
                     VALUES ?`,
                    [itemsData]
                );
            }

            // Catat Audit Trail
            await logAudit(req, {
                action: 'UPDATE_SPK_DEMAND',
                targetEntity: 'upload_history',
                targetId: id,
                details: {
                    nama_file_lama: existingSPK.nama_file,
                    nama_file_baru: finalName,
                    total_item_lama: existingSPK.total_item,
                    total_item_baru: parsedData.length,
                    shift: shiftInt
                }
            });

            return res.json({ message: 'Data Demand SPK berhasil diperbarui!', historyId: id });
        } else {
            // Hanya ganti nama file
            await db.query('UPDATE upload_history SET nama_file = ? WHERE id = ?', [finalName, id]);

            await logAudit(req, {
                action: 'UPDATE_SPK_NAME',
                targetEntity: 'upload_history',
                targetId: id,
                details: {
                    nama_file_lama: existingSPK.nama_file,
                    nama_file_baru: finalName
                }
            });

            return res.json({ message: 'Nama SPK berhasil diperbarui!' });
        }
    } catch (error) {
        console.error('[ERROR] updateSPK:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data SPK.' });
    }
};

// ============================================================
// CONTROLLER: HAPUS HISTORY SPK
// ============================================================
exports.deleteSPK = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM upload_history WHERE id = ?', [id]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data history SPK tidak ditemukan.' });
        }

        const spkRecord = rows[0];

        if (spkRecord.file_unik) {
            const safeFileName = path.basename(spkRecord.file_unik);
            const filePath = path.join(__dirname, '../uploads', safeFileName);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (unlinkErr) {
                    console.warn('[WARN] Gagal menghapus file fisik:', unlinkErr.message);
                }
            }
        }

        await db.query('DELETE FROM spk_items WHERE history_id = ?', [id]);
        await db.query('DELETE FROM upload_history WHERE id = ?', [id]);

        // Catat Audit Trail
        await logAudit(req, {
            action: 'DELETE_SPK',
            targetEntity: 'upload_history',
            targetId: id,
            details: {
                nama_file: spkRecord.nama_file,
                file_unik: spkRecord.file_unik,
                tipe_file: spkRecord.tipe_file,
                diupload_oleh: spkRecord.diupload_oleh,
                total_item: spkRecord.total_item,
                shift: spkRecord.shift
            }
        });

        res.json({ success: true, message: 'History SPK dan file fisik berhasil dihapus!' });
    } catch (error) {
        console.error('[ERROR] deleteSPK:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus history SPK' });
    }
};

// ============================================================
// CONTROLLER: DOWNLOAD DOKUMEN SPK TERAUTENTIKASI
// ============================================================
exports.downloadSPK = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            'SELECT id, nama_file, file_unik FROM upload_history WHERE id = ? LIMIT 1',
            [id]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data riwayat SPK tidak ditemukan.' });
        }

        const { nama_file, file_unik } = rows[0];

        if (!file_unik) {
            return res.status(404).json({ success: false, message: 'File dokumen fisik tidak terdaftar pada riwayat ini.' });
        }

        const safeFileName = path.basename(file_unik);
        const filePath = path.join(__dirname, '../uploads', safeFileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File fisik dokumen tidak ditemukan di server penyimpanan.' });
        }

        const downloadName = (nama_file && nama_file.trim()) ? nama_file : safeFileName;
        return res.download(filePath, downloadName);
    } catch (error) {
        console.error('[ERROR] downloadSPK:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengunduh dokumen SPK.' });
    }
};

// ============================================================
// CONTROLLER: AMBIL DATA HISTORI CHART (7 HARI TERAKHIR)
// ============================================================
exports.getChartData = async (req, res) => {
    try {
        const { startDate, endDate, targetDate } = req.query;
        let dateCondition = "h.tanggal_upload >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)";
        let queryParams = [];

        if (startDate && endDate) {
            dateCondition = "DATE(h.tanggal_upload) BETWEEN ? AND ?";
            queryParams.push(startDate, endDate);
        } else if (targetDate) {
            dateCondition = "DATE(h.tanggal_upload) BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND ?";
            queryParams.push(targetDate, targetDate);
        } else {
            const [recentCheck] = await db.query(
                "SELECT COUNT(*) as count FROM upload_history WHERE tanggal_upload >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)"
            );
            if (recentCheck[0].count === 0) {
                const [latestRows] = await db.query(
                    "SELECT DATE_FORMAT(tanggal_upload, '%Y-%m-%d') as latest_date FROM upload_history ORDER BY tanggal_upload DESC LIMIT 1"
                );
                if (latestRows && latestRows.length > 0 && latestRows[0].latest_date) {
                    const lDate = latestRows[0].latest_date;
                    dateCondition = "DATE(h.tanggal_upload) BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND ?";
                    queryParams.push(lDate, lDate);
                }
            }
        }

        const query = `
            SELECT 
                DATE_FORMAT(h.tanggal_upload, '%Y-%m-%d') as tanggal,
                h.id as history_id,
                h.mesin_digunakan,
                (SELECT IFNULL(SUM(JSON_LENGTH(wo_details)), 0) FROM spk_items s WHERE s.history_id = h.id) as total_wo
            FROM upload_history h
            WHERE ${dateCondition}
            ORDER BY tanggal ASC, h.id ASC
        `;
        const [rows] = await db.query(query, queryParams);

        const result = [];
        const dateMap = new Map();

        rows.forEach(row => {
            const dateStr = row.tanggal instanceof Date ? row.tanggal.toISOString().split('T')[0] : row.tanggal;

            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    tanggal: dateStr,
                    total_waktu_spk: 0,
                    waktu_v: 0,
                    waktu_h: 0,
                    waktu_c: 0,
                    qty_v: 0,
                    qty_h: 0,
                    qty_c: 0,
                    total_sb: 0,
                    mesin_v: 0,
                    mesin_h: 0,
                    mesin_c: 0,
                    mp_v: 0,
                    mp_h: 0,
                    mp_c: 0,
                    manpower: 0,
                    total_wo: 0
                });
            }
            const current = dateMap.get(dateStr);
            current.total_wo += Number(row.total_wo) || 0;

            if (row.mesin_digunakan) {
                try {
                    const parsed = JSON.parse(row.mesin_digunakan);
                    if (Array.isArray(parsed)) {
                        current.mesin_v += parsed.length;
                        current.mp_v += parsed.length * 3;
                        current.manpower += parsed.length * 3;
                    } else if (typeof parsed === 'object') {
                        for (const [key, data] of Object.entries(parsed)) {
                            if (key === 'CNC' || key === 'Perforasi') continue;
                            
                            const wkt = Number(data.totalWaktu) || 0;
                            const qty = Number(data.totalQty) || 0;
                            const mDibutuhkan = Number(data.mesinDibutuhkan) || 0;
                            const mpDibutuhkan = Number(data.manpowerDibutuhkan) || 0;

                            if (wkt > 0 || qty > 0) {
                                current.manpower += mpDibutuhkan;
                                current.total_waktu_spk += wkt;

                                if (key.toLowerCase().includes('vertikal')) {
                                    current.waktu_v += wkt;
                                    current.total_sb += qty;
                                    current.qty_v += qty;
                                    current.mesin_v += mDibutuhkan;
                                    current.mp_v += mpDibutuhkan;
                                }
                                else if (key.toLowerCase().includes('horizontal') || key.toLowerCase().includes('hz')) {
                                    current.waktu_h += wkt;
                                    current.qty_h += qty;
                                    current.mesin_h += mDibutuhkan;
                                    current.mp_h += mpDibutuhkan;
                                }
                                else if (key.toLowerCase().includes('carousel') || key.toLowerCase().includes('cr')) {
                                    current.waktu_c += wkt;
                                    current.qty_c += qty;
                                    current.mesin_c += mDibutuhkan;
                                    current.mp_c += mpDibutuhkan;
                                }
                            }
                        }
                    }
                } catch (e) { }
            }
        });

        for (const [key, value] of dateMap.entries()) {
            value.waktu_v_jam = +(value.waktu_v / 60).toFixed(2);
            value.waktu_h_jam = +(value.waktu_h / 60).toFixed(2);
            value.waktu_c_jam = +(value.waktu_c / 60).toFixed(2);
            value.total_waktu_jam = +(value.total_waktu_spk / 60).toFixed(2);
            result.push(value);
        }

        result.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

        res.json(result);
    } catch (error) {
        console.error('[ERROR] getChartData:', error);
        res.status(500).json({ message: 'Gagal mengambil data chart' });
    }
};

// ============================================================
// CONTROLLER: REFRESH PREVIEW KETIKA TAB AKTIF KEMBALI
// ============================================================
exports.refreshPreview = async (req, res) => {
    try {
        const { parsedData, tinggiData } = req.body;
        const updatedData = await recalculatePreviewData(parsedData, tinggiData);
        res.json({ updatedParsedData: updatedData });
    } catch (error) {
        console.error('[ERROR] refreshPreview:', error);
        res.status(500).json({ message: 'Gagal merefresh preview' });
    }
};

// ============================================================
// CONTROLLER: KALKULASI SUMMARY LENGKAP SEMUA MESIN
// ============================================================
exports.calculateSummary = async (req, res) => {
    try {
        const { parsedData } = req.body;
        if (!parsedData || !Array.isArray(parsedData)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        const [matrixVertikal] = await db.query("SELECT nama_item, cycle_time_menit, varians FROM cycle_time_matrix WHERE tipe_mesin = 'Vertikal'");
        const [matrixHorizontal] = await db.query("SELECT nama_item, varians, ct_c1, ct_c2, ct_ptu, ct_pma, ct_pmu, ct_c3 FROM cycle_time_matrix WHERE tipe_mesin = 'Horizontal'");
        const [matrixCarousel] = await db.query("SELECT nama_item, varians, ct_c1, ct_c2, ct_ptu, ct_pma, ct_c3 FROM cycle_time_matrix WHERE tipe_mesin = 'Carousel'");
        const [matrixPacking] = await db.query("SELECT varians, cycle_time_menit FROM cycle_time_matrix WHERE tipe_mesin = 'Packing'");

        const summary = calculateSummaryDetails(parsedData, matrixVertikal, matrixHorizontal, matrixCarousel, matrixPacking);
        res.json(summary);
    } catch (error) {
        console.error('[ERROR] calculateSummary:', error);
        res.status(500).json({ message: 'Gagal melakukan kalkulasi mesin' });
    }
};

// ============================================================
// CONTROLLER: KALKULASI SATU BARIS DATA (MANUAL SPK)
// ============================================================
exports.calculateSingleRow = async (req, res) => {
    try {
        const { item, qty, bahanBakuP, bahanBakuL, bahanBakuT } = req.body;
        if (!item || !qty) {
            return res.status(400).json({ message: 'Item dan Qty wajib diisi' });
        }

        const rawRow = [{
            item: item,
            qty: parseFloat(qty),
            bahanBakuP: parseFloat(bahanBakuP) || 0,
            bahanBakuL: parseFloat(bahanBakuL) || 0,
            bahanBakuT: parseFloat(bahanBakuT) || 0
        }];

        const result = await matchAndCalculate(rawRow);

        if (result && result.parsedData && result.parsedData.length > 0) {
            const calculatedRow = result.parsedData[0];
            res.json({
                mesinTujuan: calculatedRow.mesinTujuan || '-',
                prediksi_sb: calculatedRow.prediksi_sb !== null ? calculatedRow.prediksi_sb : null,
                ct: calculatedRow.ct || 0,
                tinggi_balokan: calculatedRow.tinggi_balokan || null,
                match: calculatedRow.match
            });
        } else {
            res.status(500).json({ message: 'Gagal memproses baris' });
        }

    } catch (error) {
        console.error('[ERROR] calculateSingleRow:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat kalkulasi' });
    }
};

// ============================================================
// CONTROLLER: UPDATE TINGGI SHORT BLOCK MATRIX
// ============================================================
exports.updateTinggiMatrix = async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        for (const item of items) {
            let searchQuery = `(nama_item = ? OR nama_item = ?)`;
            let params = [item.tinggi, item.busa, `LBR ${item.busa}`];

            if (item.busa === 'REBONDED 100' || item.busa === 'R 100') { searchQuery = `nama_item LIKE ?`; params = [item.tinggi, '%R 100%']; }
            else if (item.busa === 'REBONDED 50' || item.busa === 'R 50') { searchQuery = `nama_item LIKE ?`; params = [item.tinggi, '%R 50%']; }
            else if (item.busa === 'REBONDED 70' || item.busa === 'R 70') { searchQuery = `nama_item LIKE ?`; params = [item.tinggi, '%R 70%']; }
            else if (item.busa === 'REBONDED 90' || item.busa === 'R 90') { searchQuery = `nama_item LIKE ?`; params = [item.tinggi, '%R 90%']; }
            else if (item.busa === 'HR 32') { searchQuery = `nama_item LIKE ?`; params = [item.tinggi, '%HR 32%']; }
            else if (item.busa === 'RK 2' || item.busa === 'RH 3' || item.busa === 'R 40') {
               searchQuery = `(nama_item = ? OR nama_item = ?)`;
               params = [item.tinggi, item.busa, `LBR ${item.busa}`];
            }

            await db.query(`UPDATE cycle_time_matrix SET tinggi_balokan_standar = ? WHERE ${searchQuery}`, params);
        }

        res.json({ message: 'Tinggi matrix updated successfully' });
    } catch (error) {
        console.error('Failed to update tinggi matrix:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data tinggi matrix.' });
    }
};

// ============================================================
// CONTROLLER: KALKULASI OEE (STRICT METHOD)
// ============================================================
exports.calculateOEE = async (req, res) => {
    try {
        const { 
            shift_time = 420, 
            efficiency = 1.0, 
            downtime = 0, 
            machine_qty = 1, 
            cycle_time_per_machine = 1, 
            operating_time = 0, 
            total_input = 0, 
            defect_qty = 0,
            tanggal,
            tipe_mesin
        } = req.body;

        const scores = calculateOEEScores({
            shift_time,
            efficiency,
            downtime,
            machine_qty,
            cycle_time_per_machine,
            operating_time,
            total_input,
            defect_qty
        });

        if (tanggal && tipe_mesin) {
            const query = `
                INSERT INTO oee_metrics 
                (tanggal, tipe_mesin, shift_time, efficiency, downtime, machine_qty, cycle_time_per_machine, operating_time, total_input, defect_qty)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                shift_time = VALUES(shift_time),
                efficiency = VALUES(efficiency),
                downtime = VALUES(downtime),
                machine_qty = VALUES(machine_qty),
                cycle_time_per_machine = VALUES(cycle_time_per_machine),
                operating_time = VALUES(operating_time),
                total_input = VALUES(total_input),
                defect_qty = VALUES(defect_qty)
            `;
            const params = [
                tanggal, tipe_mesin, shift_time, efficiency, downtime, machine_qty, 
                cycle_time_per_machine, operating_time, total_input, defect_qty
            ];
            await db.query(query, params);
        }

        res.json(scores);
    } catch (error) {
        console.error('[ERROR] calculateOEE:', error);
        res.status(500).json({ message: 'Gagal melakukan kalkulasi OEE' });
    }
};

// ============================================================
// CONTROLLER: AMBIL DAFTAR WO AKTIF (BELUM TERPENUHI)
// ============================================================
exports.getActiveWOs = async (req, res) => {
    try {
        const { tanggal, startDate, endDate, include_fulfilled } = req.query;
        const data = await getActiveWOsList({ tanggal, startDate, endDate, include_fulfilled });
        res.json(data);
    } catch (error) {
        console.error('[ERROR] getActiveWOs:', error);
        res.status(500).json({ message: 'Gagal mengambil data WO aktif' });
    }
};
