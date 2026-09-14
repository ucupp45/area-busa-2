const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse'); // v1.1.1 — mengekspor langsung sebagai fungsi
const db = require('../config/db');

// ============================================================
// FUNGSI PARSING PDF SPK (Tetap dipertahankan sbg fallback)
// ============================================================
function parseSPKPdf(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const shiftMatch = rawText.match(/Shift\s*Group.*?Tanggal\s*(\d)/i) || rawText.match(/Shift\s*Group[^\d]*(\d)[A-Za-z]?/i);
    const parsedShift = shiftMatch && shiftMatch[1] ? parseInt(shiftMatch[1]) : 1;

    const ITEM_PATTERN = /(\d+\.\d)(\d+\.\d)(\d+\.\d{2})(\d+\.\d{2})(\d*\.\d{2})(\d+)(LBR.+?)SH/i;
    const ROW_HEADER_PATTERN = /^(\d{1,3})\s{2,}(\d{7})(.*)/;

    let items = [];
    let currentItem = null;

    for (const line of lines) {
        const headerMatch = line.match(ROW_HEADER_PATTERN);
        if (headerMatch) {
            if (currentItem) items.push(currentItem);

            const cleanCustomer = headerMatch[3].replace(/\d+\.\d+.*$/, '').trim();
            currentItem = {
                noWo: headerMatch[2],
                customer: cleanCustomer ? [cleanCustomer] : [],
                lines: [line]
            };
        } else if (currentItem) {
            if (!/^\d+\.\d/.test(line) && !/^\d{5,}-/.test(line) && !/^\//.test(line) && !line.match(ITEM_PATTERN)) {
                currentItem.customer.push(line);
            }
            currentItem.lines.push(line);
        }
    }
    if (currentItem) items.push(currentItem);

    const rows = [];
    for (const item of items) {
        const fullText = item.lines.join(' ');
        const itemMatch = fullText.match(ITEM_PATTERN);
        if (itemMatch) {
            let p = parseFloat(itemMatch[1]);
            let l = parseFloat(itemMatch[2]);
            const t = parseFloat(itemMatch[4]); // T Bahan Baku

            const qtyBB = parseFloat(itemMatch[5]);
            const qtyCut = parseInt(itemMatch[6]);
            const baseName = itemMatch[7].trim();
            const junkPatterns = [
                /Dibuat Oleh/i, /Disetujui Oleh/i, /SURAT PERINTAH KERJA/i,
                /Shift Group/i, /Kode Mesin/i, /PLPLTT/i, /QtySPK/i, /Tanggal/i, /Mesin Vertikal/i,
                /No WONoUkuran/i, /Bahan Baku/i
            ];
            const validCustomerParts = item.customer.filter(part => !junkPatterns.some(regex => regex.test(part)));
            let customerStr = validCustomerParts.join(' ').trim() || '-';
            if (customerStr.length > 140) {
                customerStr = customerStr.substring(0, 140);
            }

            // Ekstrak P dan L dari Bahan Baku
            const bbMatch = fullText.match(/(\d{2,3}\.\d)\s*(\d{2,3}\.\d)/g);
            if (bbMatch && bbMatch.length > 0) {
                const lastMatch = bbMatch[bbMatch.length - 1];
                const parts = lastMatch.match(/(\d{2,3}\.\d)\s*(\d{2,3}\.\d)/);
                if (parts) {
                    let bb_l = parseFloat(parts[1]);
                    let bb_p = parseFloat(parts[2]);
                    p = bb_p;
                    l = bb_l;
                }
            }

            const namaItem = `${baseName} (${p}x${l}x${t})`;

            if (qtyBB > 0 && baseName) {
                rows.push({
                    noWo: item.noWo,
                    customer: customerStr,
                    item: namaItem,
                    qtyBB,
                    qtyCut,
                    bahanBakuP: p,
                    bahanBakuL: l,
                    bahanBakuT: t
                });
            }
        }
    }

    return { rows, shift: parsedShift };
}


// ============================================================
// FUNGSI PARSING EXCEL SPK (Membaca RAW DATA ERP)
// ============================================================
function parseSPKExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const rows = sheetData.map(row => {
        let p = parseFloat(row['Panjang'] || row['P']) || 0;
        let l = parseFloat(row['Lebar'] || row['L']) || 0;
        let t = parseFloat(row['Tinggi'] || row['T']) || 0;

        const baseItem = row['Description'] || row['Nama Item'] || row['Bahan Baku'] || '';

        // Fallback: Extract from baseItem if P, L, or T is missing
        if ((p === 0 || l === 0 || t === 0) && baseItem) {
            const dimMatch = baseItem.match(/\(([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)\)/i);
            if (dimMatch) {
                p = p || parseFloat(dimMatch[1]);
                l = l || parseFloat(dimMatch[2]);
                t = t || parseFloat(dimMatch[3]);
            }
        }

        const hasDim = p > 0 || l > 0 || t > 0;
        const finalItemName = hasDim && !baseItem.includes(`${p}x${l}x${t}`) && !baseItem.match(/\([\d.x\s]+\)/)
            ? `${baseItem.trim()} (${p}x${l}x${t})`
            : baseItem.trim();

        // Customer string safety
        const customerRaw = row['Customer Name'] || row['Customer'] || '-';
        let customerName = String(customerRaw).trim();
        if (customerName.length > 140) customerName = customerName.substring(0, 140);

        return {
            noWo: row['WO Number'] || row['No WO'] || '-',
            customer: customerName,
            item: finalItemName, // Gabungan Kualitas & Dimensi untuk dicocokkan ke database
            qty: parseFloat(row['Quantity Ordered'] || row['Qty Cutting'] || row['Qty'] || 0),
            qtyBB: parseFloat(row['Quantity Ordered'] || row['Qty Bahan Baku'] || row['Qty BB'] || 0),
            qtyCut: parseInt(row['Quantity Ordered'] || row['Qty Cutting'] || row['Qty'] || 0),
            bahanBakuP: p,
            bahanBakuL: l,
            bahanBakuT: t
        };
    }).filter(r => r.item && (r.qty > 0 || r.qtyBB > 0));

    return { rows, shift: 1 };
}

// ============================================================
// FUNGSI PENCOCOKAN & KALKULASI (digunakan oleh Excel & PDF)
// ============================================================
async function matchAndCalculate(rawRows) {
    const [matrixData] = await db.query('SELECT * FROM cycle_time_matrix');

    let parsedData = [];
    let summaryPerMesin = {
        'Vertikal': { totalWaktu: 0, totalQty: 0 },
        'Horizontal': { totalWaktu: 0, totalQty: 0 },
        'Carousel': { totalWaktu: 0, totalQty: 0 },
        'CNC': { totalWaktu: 0, totalQty: 0 },
        'Packing': { totalWaktu: 0, totalQty: 0 }
    };

    const sortedMatrix = [...matrixData].sort((a, b) => b.nama_item.length - a.nama_item.length);

    // TAHAP 1: Hitung Kebutuhan SB per baris dan simpan di array sementara
    const parsedRows = [];
    for (const row of rawRows) {
        const p = Number(row.bahanBakuP) || 0;
        const l = Number(row.bahanBakuL) || 0;
        const t = Number(row.bahanBakuT) || 0;
        const actualQty = row.qtyBB !== undefined ? row.qtyBB : row.qty;

        row.p = p;
        row.l = l;
        row.t = t;
        row.actualQty = actualQty;

        let packingFrekuensiRow = 0;
        if (t > 0 && actualQty > 0) {
            packingFrekuensiRow = Math.ceil((t * actualQty) / 20);
        }
        row.packingFrekuensiRow = packingFrekuensiRow;

        const cleanItemName = row.item.replace(/\s*\([\d.x]+\)\s*$/, '').trim();
        const cleanItemNoSpace = cleanItemName.replace(/\s+/g, '').toLowerCase();

        row.cleanItemNoSpace = cleanItemNoSpace;
        row.tinggiBalokan = null;
        row.prediksiSB = null;

        const matchedTinggi = sortedMatrix.find(m => {
            const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
            return cleanItemNoSpace.includes(dbNameNoSpace) && m.tinggi_balokan_standar > 0;
        });

        if (matchedTinggi) {
            row.tinggiBalokan = Number(matchedTinggi.tinggi_balokan_standar);
            if (row.tinggiBalokan > 0 && t > 0) {
                row.prediksiSB = (t * actualQty) / row.tinggiBalokan;
            }
        }

        parsedRows.push(row);
    }

    // TAHAP 2: Agregasi (Grouping) L, T, serta Kualitas
    const groupedMap = new Map();
    for (const row of parsedRows) {
        const key = `${row.cleanItemNoSpace}_${row.l}_${row.t}`;

        if (!groupedMap.has(key)) {
            groupedMap.set(key, {
                woCustPairs: new Map(),
                cleanItemNoSpace: row.cleanItemNoSpace,
                item: row.item, // Akan menampilkan deskripsi dari baris pertama
                p: row.p,
                l: row.l,
                t: row.t,
                tinggiBalokan: row.tinggiBalokan,
                totalQty: 0,
                totalQtyCut: 0,
                totalPrediksiSB: 0,
                hasNullPrediksi: false,
                totalPackingFrekuensi: 0
            });
        }

        const group = groupedMap.get(key);
        const currentWo = row.noWo || row['WO Number'] || row['No WO'] || '-';
        const currentCust = row.customer || '-';
        group.woCustPairs.set(currentWo, currentCust);

        group.totalQty += row.actualQty;
        group.totalQtyCut += (row.qtyCut || 0);
        group.totalPackingFrekuensi += (row.packingFrekuensiRow || 0);

        if (row.prediksiSB !== null) {
            group.totalPrediksiSB += row.prediksiSB;
        } else {
            group.hasNullPrediksi = true;
        }
    }

    // TAHAP 3: Penentuan Routing & Hitung Cycle Time dari Data yang Dikelompokkan
    for (const group of groupedMap.values()) {
        let targetMachine = 'Horizontal'; // Default

        if (group.totalPrediksiSB >= 5) {
            targetMachine = 'Carousel';
        } else {
            targetMachine = 'Horizontal';
        }

        // Cari Match Item dengan DB
        let matchedItem = sortedMatrix.find(m => {
            const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
            return dbNameNoSpace === group.cleanItemNoSpace && m.tipe_mesin === targetMachine;
        });

        if (!matchedItem) {
            matchedItem = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                return group.cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === targetMachine;
            });
        }

        let isMatched = !!matchedItem;

        // Tandai sebagai anomali jika prediksi SB belum terhitung (karena tinggi balokan tidak ada)
        if (group.hasNullPrediksi) {
            isMatched = false;
        }

        let ct = 0;
        let estimasiWaktu = 0;

        if (!isMatched) {
            targetMachine = null;
        }

        // Horizontal / Carousel CT diset ke 0 karena hanya diiris ketebalannya
        ct = 0;
        estimasiWaktu = 0;

        // Cari CT Vertikal untuk kualitas ini secara umum (agar tersedia di frontend untuk kalkulasi lengkap)
        let matchedItemVertikal = sortedMatrix.find(m => {
            const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
            return dbNameNoSpace === group.cleanItemNoSpace && m.tipe_mesin === 'Vertikal';
        });
        if (!matchedItemVertikal) {
            matchedItemVertikal = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                return group.cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === 'Vertikal';
            });
        }

        // Evaluasi tambahan untuk Vertikal (Pembelahan) untuk menambah summaryPerMesin di backend (meskipun frontend akan menghitung ulang)
        if (targetMachine !== 'CNC') {
            if (matchedItemVertikal) {
                const ctVertikalMenit = Number(matchedItemVertikal.cycle_time_menit);
                const sbMultiplier = !group.hasNullPrediksi ? group.totalPrediksiSB : group.totalQty;
                const waktuVertikal = Number((sbMultiplier * ctVertikalMenit).toFixed(2));
                summaryPerMesin['Vertikal'].totalWaktu += waktuVertikal;
                summaryPerMesin['Vertikal'].totalQty += sbMultiplier;
            }
        }

        if (targetMachine) {
            summaryPerMesin[targetMachine].totalWaktu += estimasiWaktu;
            summaryPerMesin[targetMachine].totalQty += group.totalQty;
        }

        const joinedWos = [];
        const joinedCustomers = [];
        for (const [wo, cust] of group.woCustPairs.entries()) {
            joinedWos.push(wo);
            joinedCustomers.push(cust);
        }

        // --- PACKING CALCULATION ---
        const joinedCustomersString = joinedCustomers.join(', ');
        const isRas = joinedCustomersString.toLowerCase().includes('ras');
        
        const packingVarians = isRas ? 'Varians III' : 'Varians I';
        let packingCt = isRas ? 0.15 : 0.47;
        const matchedPacking = matrixData.find(m => m.tipe_mesin === 'Packing' && m.varians === packingVarians);
        if (matchedPacking) {
            packingCt = Number(matchedPacking.cycle_time_menit);
        }


        const packingFrekuensi = group.totalPackingFrekuensi;

        const packingSummary = Number((packingCt * packingFrekuensi).toFixed(2));

        summaryPerMesin['Packing'].totalWaktu += packingSummary;
        summaryPerMesin['Packing'].totalQty += group.totalQty;
        summaryPerMesin['Packing'].totalFrekuensi = (summaryPerMesin['Packing'].totalFrekuensi || 0) + packingFrekuensi;

        parsedData.push({
            noWo: joinedWos.join(', '),
            customer: joinedCustomers.join(', '),
            item: group.item,
            qty: group.totalQty,
            qtyCut: group.totalQtyCut,
            bahanBakuP: group.p || null,
            bahanBakuL: group.l || null,
            bahanBakuT: group.t || null,
            ukuranP: group.p || null,
            ukuranL: group.l || null,
            ukuranT: group.t || null,
            match: isMatched,
            ct: ct,
            ct_vertikal: matchedItemVertikal ? Number(matchedItemVertikal.cycle_time_menit) : 0,
            ct_c1: matchedItem ? Number(matchedItem.ct_c1) : 0,
            ct_c2: matchedItem ? Number(matchedItem.ct_c2) : 0,
            ct_ptu: matchedItem ? Number(matchedItem.ct_ptu) : 0,
            ct_pma: matchedItem ? Number(matchedItem.ct_pma) : 0,
            ct_pmu: matchedItem ? Number(matchedItem.ct_pmu) : 0,
            ct_c3: matchedItem ? Number(matchedItem.ct_c3) : 0,
            waktu: estimasiWaktu,
            mesinTujuan: targetMachine,
            tinggi_balokan: group.tinggiBalokan,
            prediksi_sb: !group.hasNullPrediksi ? Number(group.totalPrediksiSB.toFixed(4)) : null,
            originalQty: group.totalQty,
            originalT: group.t,
            packing_frekuensi_awal: group.totalPackingFrekuensi,
            packing_frekuensi: packingFrekuensi,
            packing_varians: packingVarians,
            packing_ct: packingCt,
            packing_summary: packingSummary
        });
    }

    let totalEstimasiWaktu = 0;
    Object.values(summaryPerMesin).forEach(s => totalEstimasiWaktu += s.totalWaktu);
    totalEstimasiWaktu = Number(totalEstimasiWaktu.toFixed(2));

    return { parsedData, totalEstimasiWaktu, summaryPerMesin };
}

// ============================================================
// FUNGSI UNTUK MENGAMBIL CYCLE TIME BERDASARKAN NAMA ITEM
// ============================================================
exports.getCT = async (req, res) => {
    try {
        const { item } = req.body;
        if (!item) return res.json({ ct: 0 });

        const [matrixData] = await db.query('SELECT id, nama_item, cycle_time_menit FROM cycle_time_matrix');
        const sortedMatrix = [...matrixData].sort((a, b) => b.nama_item.length - a.nama_item.length);
        const cleanItemName = item.replace(/\s*\([\d.x]+\)\s*$/, '').trim();

        let matchedItem = sortedMatrix.find(m =>
            m.nama_item.toLowerCase().trim() === cleanItemName.toLowerCase()
        );

        if (!matchedItem) {
            matchedItem = sortedMatrix.find(m =>
                cleanItemName.toLowerCase().includes(m.nama_item.toLowerCase().trim())
            );
        }

        res.json({ ct: matchedItem ? matchedItem.cycle_time_menit : 0 });
    } catch (error) {
        console.error('[ERROR] getCT:', error);
        res.status(500).json({ ct: 0 });
    }
};

// ============================================================
// CONTROLLER: PREVIEW SPK (Excel + PDF)
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
            const parsedRes = parseSPKExcel(filePath);
            rawRows = parsedRes.rows;
            parsedShift = parsedRes.shift;
        } else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Format file tidak didukung. Gunakan .xls/.xlsx' });
        }

        if (rawRows.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                message: `File berhasil dibaca, namun tidak ada data item yang dapat diekstrak.`
            });
        }

        const [manpowerRows] = await db.query('SELECT * FROM mesin_manpower');
        const manpowerMap = {};
        for (const row of manpowerRows) {
            manpowerMap[row.tipe_mesin] = row;
        }

        const { parsedData, totalEstimasiWaktu, summaryPerMesin } = await matchAndCalculate(rawRows);

        const kapasitasPerMesin = 420; // Sesuaikan dengan durasi shift (7 jam)

        // Hitung kebutuhan mesin & manpower per tipe mesin
        for (const [machineType, data] of Object.entries(summaryPerMesin)) {
            let maxCapacity = 1;
            let manpowerPerMachine = 1;

            if (manpowerMap[machineType]) {
                maxCapacity = manpowerMap[machineType].total_mesin;
                manpowerPerMachine = manpowerMap[machineType].manpower_per_mesin;
            } else if (machineType === 'CNC' || machineType === 'Perforasi') {
                maxCapacity = 1;
                manpowerPerMachine = 2;
            }

            // Estimasi mesin dibutuhkan
            let reqMachines = Math.ceil(data.totalWaktu / kapasitasPerMesin);
            if (reqMachines > maxCapacity) reqMachines = maxCapacity;

            // Jika mesin CNC/Perforasi CT-nya 0 (sementara), hitung mesin = 1 jika ada Qty
            if ((machineType === 'CNC' || machineType === 'Perforasi') && data.totalQty > 0) {
                reqMachines = 1;
            }

            let reqManpower = reqMachines * manpowerPerMachine;

            const utilisasi = reqMachines > 0
                ? (data.totalWaktu / (reqMachines * kapasitasPerMesin)) * 100
                : 0;

            let status = 'Efisien';
            if (utilisasi < 50) status = 'Tidak Efisien';
            else if (utilisasi < 80) status = 'Cukup';

            // Jika CT = 0 (CNC/Perforasi) tapi ada qty
            if ((machineType === 'CNC' || machineType === 'Perforasi') && data.totalQty > 0) {
                status = 'Menunggu CT';
            }

            summaryPerMesin[machineType] = {
                ...data,
                mesinDibutuhkan: reqMachines,
                manpowerDibutuhkan: reqManpower,
                persentaseUtilisasi: Number(utilisasi.toFixed(2)),
                utilisasiStatus: status
            };
        }

        // ── Ambil mesin yang tersedia (tidak Maintenance) ──
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

        const maxMesin = mesinAvailable.length > 0 ? mesinAvailable.length : 3;

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
            summaryPerMesin,
            mesinTerpilih,
            existingWaktu,
            mesinAvailable: mesinAvailable.map(m => ({ id: m.mesin_id, status: m.status, oee: m.oee })),
            mesinMaintenance: mesinMaintenance.map(m => m.mesin_id),
            totalMesinAvailable: mesinAvailable.length,
        });

    } catch (error) {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.error('[ERROR] previewSPK:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memproses SPK', error: error.message });
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

        const mesinJson = mesinTerpilih ? JSON.stringify(mesinTerpilih) : JSON.stringify([]);
        const [historyResult] = await db.query(
            `INSERT INTO upload_history (nama_file, file_unik, tipe_file, diupload_oleh, total_item, status, mesin_digunakan, shift) 
             VALUES (?, ?, ?, ?, ?, 'Locked', ?, ?)`,
            [fileName, fileUnik, fileType, user, parsedData.length, mesinJson, shiftInt]
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
            item.prediksi_sb || null
        ]);

        if (itemsData.length > 0) {
            await db.query(
                `INSERT INTO spk_items (history_id, no_wo, customer, nama_item, qty, estimasi_waktu_menit, match_db, spk_cutting, ukuran_p, ukuran_l, ukuran_t, qty_cutting, bahan_baku_p, bahan_baku_l, bahan_baku_t, keterangan, tipe_mesin, tinggi_balokan, prediksi_sb) 
                 VALUES ?`,
                [itemsData]
            );
        }

        res.json({ message: 'SPK berhasil dikunci dan disimpan ke database!', historyId });
    } catch (error) {
        console.error('[ERROR] saveSPK:', error);
        res.status(500).json({ message: 'Gagal menyimpan SPK ke database', error: error.message });
    }
};

// ============================================================
// CONTROLLER AMBIL HISTORY SPK
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
// CONTROLLER: AMBIL EXISTING WAKTU (Untuk update prediksi instan)
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
// CONTROLLER: AMBIL REKAP STOK (DARI SPK ITEMS)
// ==========================================
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
        const [historyRows] = await db.query(
            `SELECT id, mesin_digunakan FROM upload_history 
             WHERE DATE(tanggal_upload) = CURDATE() 
             ORDER BY id ASC`
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

            // Hitung total waktu dari penjumlahan semua waktu per mesin
            for (const data of Object.values(waktuPerMesin)) {
                totalWaktu += data.waktu;
            }

            const [itemResult] = await db.query(
                `SELECT s.nama_item, SUM(s.qty) as total_qty, 
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
// CONTROLLER: UPDATE NAMA FILE SPK
// ============================================================
exports.updateSPK = async (req, res) => {
    const { id } = req.params;
    const { nama_file } = req.body;
    try {
        await db.query('UPDATE upload_history SET nama_file = ? WHERE id = ?', [nama_file, id]);
        res.json({ message: 'Nama SPK berhasil diperbarui!' });
    } catch (error) {
        console.error('[ERROR] updateSPK:', error);
        res.status(500).json({ message: 'Gagal memperbarui nama SPK' });
    }
};

// ============================================================
// CONTROLLER: HAPUS HISTORY SPK
// ============================================================
exports.deleteSPK = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT file_unik FROM upload_history WHERE id = ?', [id]);

        if (rows.length > 0 && rows[0].file_unik) {
            const filePath = path.join(__dirname, '../uploads', rows[0].file_unik);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await db.query('DELETE FROM upload_history WHERE id = ?', [id]);
        res.json({ message: 'History SPK dan file fisik berhasil dihapus!' });
    } catch (error) {
        console.error('[ERROR] deleteSPK:', error);
        res.status(500).json({ message: 'Gagal menghapus history SPK' });
    }
};

// ============================================================
// CONTROLLER: AMBIL DATA HISTORI CHART (7 HARI TERAKHIR)
// ============================================================
exports.getChartData = async (req, res) => {
    try {
        const query = `
            SELECT 
                DATE_FORMAT(h.tanggal_upload, '%Y-%m-%d') as tanggal,
                h.id as history_id,
                h.mesin_digunakan
            FROM upload_history h
            WHERE h.tanggal_upload >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            ORDER BY tanggal ASC, h.id ASC
        `;
        const [rows] = await db.query(query);

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
                    total_sb: 0,
                    mesin_v: 0,
                    mesin_h: 0,
                    mesin_c: 0,
                    mp_v: 0,
                    mp_h: 0,
                    mp_c: 0,
                    manpower: 0
                });
            }
            const current = dateMap.get(dateStr);

            if (row.mesin_digunakan) {
                try {
                    const parsed = JSON.parse(row.mesin_digunakan);
                    if (Array.isArray(parsed)) {
                        // fallback
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
                                    current.mesin_v += mDibutuhkan;
                                    current.mp_v += mpDibutuhkan;
                                }
                                else if (key.toLowerCase().includes('horizontal') || key.toLowerCase().includes('hz')) {
                                    current.waktu_h += wkt;
                                    current.mesin_h += mDibutuhkan;
                                    current.mp_h += mpDibutuhkan;
                                }
                                else if (key.toLowerCase().includes('carousel') || key.toLowerCase().includes('cr')) {
                                    current.waktu_c += wkt;
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
            // Waktu in hours for easier reading on charts
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
        const [matrixData] = await db.query('SELECT * FROM cycle_time_matrix');
        const sortedMatrix = [...matrixData].sort((a, b) => b.nama_item.length - a.nama_item.length);

        // Buat map dari tinggiData (localStorage) untuk lookup cepat
        // tinggiData format: [{ busa: "TF 2", tinggi: 60 }, ...]
        const tinggiMap = new Map();
        if (tinggiData && Array.isArray(tinggiData)) {
            tinggiData.forEach(item => {
                if (item.busa && item.tinggi > 0) {
                    tinggiMap.set(item.busa.replace(/\s+/g, '').toLowerCase(), Number(item.tinggi));
                }
            });
        }

        const updatedData = parsedData.map(row => {
            const cleanItemName = row.item.replace(/\s*\([\d.x\s]+\)\s*$/, '').trim();
            const cleanItemNoSpace = cleanItemName.replace(/\s+/g, '').toLowerCase();

            let targetMachine = row.mesinTujuan;
            let ct = row.ct;
            let isMatched = row.match;

            // Cari match Tinggi Balokan dari tinggiData (localStorage) terlebih dahulu
            let foundTinggi = null;
            for (const [busaKey, tinggiVal] of tinggiMap.entries()) {
                if (cleanItemNoSpace.includes(busaKey)) {
                    foundTinggi = tinggiVal;
                    break;
                }
            }

            // Fallback ke cycle_time_matrix jika tidak ditemukan di tinggiData
            if (!foundTinggi) {
                const matchedTinggi = sortedMatrix.find(m => {
                    const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                    return cleanItemNoSpace.includes(dbNameNoSpace) && m.tinggi_balokan_standar > 0;
                });
                if (matchedTinggi) {
                    foundTinggi = Number(matchedTinggi.tinggi_balokan_standar);
                }
            }

            if (foundTinggi) {
                row.tinggi_balokan = foundTinggi;
                let t = Number(row.ukuranT) || Number(row.bahanBakuT) || 0;

                // Fallback: extract T from item string if not set (e.g. "LBR TF 2 BLACK (200x160x28)")
                if (t === 0) {
                    const dimMatch = row.item.match(/\([\d.]+\s*x\s*[\d.]+\s*x\s*([\d.]+)\)/i);
                    if (dimMatch) {
                        t = Number(dimMatch[1]);
                    }
                }

                if (row.tinggi_balokan > 0 && t > 0) {
                    row.prediksi_sb = Number(((t * row.qty) / row.tinggi_balokan).toFixed(4));
                }
            }

            // SELALU re-evaluate routing Horizontal/Carousel berdasarkan prediksi_sb terbaru
            // Rule: < 5 → Horizontal, >= 5 → Carousel
            if (row.prediksi_sb !== null && row.prediksi_sb !== undefined) {
                let newMachine = row.prediksi_sb >= 5 ? 'Carousel' : 'Horizontal';

                // Cek apakah item ini ditemukan di DB untuk mesin yang ditentukan
                let matchedForMachine = sortedMatrix.find(m => {
                    const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                    return dbNameNoSpace === cleanItemNoSpace && m.tipe_mesin === newMachine;
                });
                if (!matchedForMachine) {
                    matchedForMachine = sortedMatrix.find(m => {
                        const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                        return cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === newMachine;
                    });
                }

                if (matchedForMachine) {
                    targetMachine = newMachine;
                    row.mesinTujuan = newMachine;
                    isMatched = true;
                    row.match = true;
                }
            }

            // Jika awalnya tidak match, mungkin sekarang sudah match?
            if (!isMatched) {
                let p = Number(row.ukuranP) || Number(row.bahanBakuP) || 0;
                let l = Number(row.ukuranL) || Number(row.bahanBakuL) || 0;

                if (p === 0 || l === 0) {
                    const dimMatch = row.item.match(/\(([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)\)/i);
                    if (dimMatch) {
                        p = Number(dimMatch[1]);
                        l = Number(dimMatch[2]);
                    }
                }

                let tempMachine = 'Horizontal';
                if (row.prediksi_sb >= 5) tempMachine = 'Carousel';

                let matchedItem = sortedMatrix.find(m => {
                    const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                    return dbNameNoSpace === cleanItemNoSpace && m.tipe_mesin === tempMachine;
                });
                if (!matchedItem) {
                    matchedItem = sortedMatrix.find(m => {
                        const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                        return cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === tempMachine;
                    });
                }

                if (matchedItem) {
                    isMatched = true;
                    targetMachine = tempMachine;
                    row.match = true;
                    row.mesinTujuan = targetMachine;
                }
            }

            // Recalculate CT dan waktu
            let estimasiWaktu = row.waktu || 0;
            if (targetMachine === 'Vertikal') {
                let matchedItemVertikal = sortedMatrix.find(m => {
                    const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                    return dbNameNoSpace === cleanItemNoSpace && m.tipe_mesin === 'Vertikal';
                });
                if (!matchedItemVertikal) {
                    matchedItemVertikal = sortedMatrix.find(m => {
                        const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                        return cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === 'Vertikal';
                    });
                }
                if (matchedItemVertikal) {
                    ct = Number(matchedItemVertikal.cycle_time_menit);
                    const sbMultiplier = row.prediksi_sb !== null ? row.prediksi_sb : row.qty;
                    estimasiWaktu = Number((sbMultiplier * ct).toFixed(2));
                }
            } else if (targetMachine === 'Horizontal' || targetMachine === 'Carousel') {
                ct = 0; estimasiWaktu = 0;
            } else if (targetMachine === 'CNC' || targetMachine === 'Perforasi') {
                ct = 0; estimasiWaktu = 0;
            } else {
                estimasiWaktu = Number((row.qty * ct).toFixed(2));
            }

            if (row.prediksi_sb == null) {
                isMatched = false;
                row.match = false;
            }

            if (!isMatched) targetMachine = null;

            // Pastikan field CT di-populate agar frontend bisa recalculate
            let finalMatchedItem = sortedMatrix.find(m => m.tipe_mesin === targetMachine && (m.nama_item.replace(/\s+/g, '').toLowerCase() === cleanItemNoSpace || cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase())));
            let finalMatchedVertikal = sortedMatrix.find(m => m.tipe_mesin === 'Vertikal' && (m.nama_item.replace(/\s+/g, '').toLowerCase() === cleanItemNoSpace || cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase())));

            row.ct_vertikal = finalMatchedVertikal ? Number(finalMatchedVertikal.cycle_time_menit) : 0;
            row.ct_c1 = finalMatchedItem ? Number(finalMatchedItem.ct_c1) : 0;
            row.ct_c2 = finalMatchedItem ? Number(finalMatchedItem.ct_c2) : 0;
            row.ct_ptu = finalMatchedItem ? Number(finalMatchedItem.ct_ptu) : 0;
            row.ct_pma = finalMatchedItem ? Number(finalMatchedItem.ct_pma) : 0;
            row.ct_pmu = finalMatchedItem ? Number(finalMatchedItem.ct_pmu) : 0;
            row.ct_c3 = finalMatchedItem ? Number(finalMatchedItem.ct_c3) : 0;

            row.ct = ct;
            row.waktu = estimasiWaktu;
            row.mesinTujuan = targetMachine;

            return row;
        });

        res.json({ updatedParsedData: updatedData });

    } catch (error) {
        console.error('[ERROR] refreshPreview:', error);
        res.status(500).json({ message: 'Gagal merefresh preview' });
    }
};
exports.calculateSummary = async (req, res) => {
    try {
        const { parsedData } = req.body;
        if (!parsedData || !Array.isArray(parsedData)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        // Ambil data matriks dari database
        const [matrixVertikal] = await db.query("SELECT nama_item, cycle_time_menit, varians FROM cycle_time_matrix WHERE tipe_mesin = 'Vertikal'");
        const [matrixHorizontal] = await db.query("SELECT nama_item, varians, ct_c1, ct_c2, ct_ptu, ct_pma, ct_pmu, ct_c3 FROM cycle_time_matrix WHERE tipe_mesin = 'Horizontal'");
        const [matrixCarousel] = await db.query("SELECT nama_item, varians, ct_c1, ct_c2, ct_ptu, ct_pma, ct_c3 FROM cycle_time_matrix WHERE tipe_mesin = 'Carousel'");
        const [matrixPacking] = await db.query("SELECT varians, cycle_time_menit FROM cycle_time_matrix WHERE tipe_mesin = 'Packing'");

        const sortedVertikal = matrixVertikal.sort((a, b) => b.nama_item.length - a.nama_item.length);
        const sortedHorizontal = matrixHorizontal.sort((a, b) => b.nama_item.length - a.nama_item.length);
        const sortedCarousel = matrixCarousel.sort((a, b) => b.nama_item.length - a.nama_item.length);

        let totalWaktuVertikal = 0;
        let totalWaktuHorizontal = 0;
        let totalWaktuCarousel = 0;
        let totalWaktuPacking = 0;

        let totalQtyHorizontal = 0;
        let totalQtyCarousel = 0;
        let totalFrekuensiPacking = 0;

        const vertikalData = [];
        const horizontalData = [];
        const carouselData = [];
        const packingData = [];

        parsedData.forEach(row => {
            const cleanItemNoSpace = (row.item || '').replace(/\s+/g, '').toLowerCase();
            const qty = parseFloat(row.qty) || 0;

            // Ekstrak nilai T (tinggi) dari WO
            let t = Number(row.ukuranT) || Number(row.bahanBakuT) || 0;
            if (t === 0 && row.item) {
                const dimMatch = row.item.match(/\(([\d.]+)\s*[xX]\s*([\d.]+)\s*[xX]\s*([\d.]+)\)/);
                if (dimMatch) {
                    t = Number(dimMatch[3]);
                }
            }

            const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

            // --- KALKULASI KEBUTUHAN SB (Dipakai untuk semua mesin) ---
            let kebutuhanSB = 0;
            if (row.prediksi_sb !== null && row.prediksi_sb !== undefined) {
                kebutuhanSB = round2(parseFloat(row.prediksi_sb) || 0);
            } else {
                kebutuhanSB = round2(qty);
            }

            // --- KALKULASI VERTIKAL (Hitung untuk semua baris tanpa kecuali) ---
            let ctVertikal = 0;
            let variansVertikal = '-';

            const matchedVertikal = sortedVertikal.find(m => cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()));
            if (matchedVertikal) {
                ctVertikal = parseFloat(matchedVertikal.cycle_time_menit) || 0;
                variansVertikal = matchedVertikal.varians || '-';
            }

            const subtotalWaktuVertikal = kebutuhanSB * ctVertikal;
            totalWaktuVertikal += subtotalWaktuVertikal;

            vertikalData.push({
                description: row.item,
                qty: qty,
                kebutuhanSB: kebutuhanSB.toFixed(2),
                varians: variansVertikal,
                ctVertikal: ctVertikal.toFixed(2),
                subtotalWaktu: subtotalWaktuVertikal.toFixed(2)
            });

            // --- KALKULASI HORIZONTAL (Hanya jika tag mesin adalah Horizontal) ---
            if (row.mesinTujuan === 'Horizontal') {
                totalQtyHorizontal += qty;
                let c1Matriks = 0, c2Matriks = 0, ptuMatriks = 0, pmaMatriks = 0, pmuMatriks = 0, c3Matriks = 0;
                let variansHorizontal = '-';

                const matched = sortedHorizontal.find(m => cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()));
                if (matched) {
                    c1Matriks = parseFloat(matched.ct_c1) || 0;
                    c2Matriks = parseFloat(matched.ct_c2) || 0;
                    ptuMatriks = parseFloat(matched.ct_ptu) || 0;
                    pmaMatriks = parseFloat(matched.ct_pma) || 0;
                    pmuMatriks = parseFloat(matched.ct_pmu) || 0;
                    c3Matriks = parseFloat(matched.ct_c3) || 0;
                    variansHorizontal = matched.varians || '-';
                }

                const c1 = round2(c1Matriks * kebutuhanSB);
                const c2 = round2(c2Matriks * kebutuhanSB);
                const calcPtu = round2(ptuMatriks * t * qty);
                const calcPma = round2(pmaMatriks * qty);
                const calcPmu = round2(pmuMatriks * qty);
                const c3 = round2(c3Matriks * kebutuhanSB);

                const subtotalWaktu = round2(c1 + c2 + calcPtu + calcPma + calcPmu + c3);
                totalWaktuHorizontal += subtotalWaktu;

                horizontalData.push({
                    description: row.item,
                    qty: qty,
                    kebutuhanSB: kebutuhanSB.toFixed(2),
                    c1: c1.toFixed(2),
                    c2: c2.toFixed(2),
                    calcPtu: calcPtu.toFixed(2),
                    calcPma: calcPma.toFixed(2),
                    calcPmu: calcPmu.toFixed(2),
                    c3: c3.toFixed(2),
                    varians: variansHorizontal,
                    subtotalWaktu: subtotalWaktu.toFixed(2)
                });
            }

            // --- KALKULASI CAROUSEL (Hanya jika tag mesin adalah Carousel) ---
            if (row.mesinTujuan === 'Carousel') {
                totalQtyCarousel += qty;
                let c1Matriks = 0, c2Matriks = 0, ptuMatriks = 0, pmaMatriks = 0, c3Matriks = 0;
                let variansCarousel = '-';

                const matched = sortedCarousel.find(m => cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()));
                if (matched) {
                    c1Matriks = parseFloat(matched.ct_c1) || 0;
                    c2Matriks = parseFloat(matched.ct_c2) || 0;
                    ptuMatriks = parseFloat(matched.ct_ptu) || 0;
                    pmaMatriks = parseFloat(matched.ct_pma) || 0;
                    c3Matriks = parseFloat(matched.ct_c3) || 0;
                    variansCarousel = matched.varians || '-';
                }

                // C1 tetap
                const c1 = c1Matriks;
                // C2 = C2 * kebutuhan SB
                const c2 = c2Matriks * kebutuhanSB;

                // Menyederhanakan rumus (SH / Kebutuhan SB) * (Kebutuhan SB / 6) = SH / 6
                const faktorBagi = qty / 6;
                // PTU = PTU * tinggi * (SH / 6)
                const calcPtu = ptuMatriks * t * faktorBagi;
                // PMA = PMA * (SH / 6)
                const calcPma = pmaMatriks * faktorBagi;
                // C3 = C3 * kebutuhan SB
                const c3 = c3Matriks * kebutuhanSB;

                const subtotalWaktu = c1 + c2 + calcPtu + calcPma + c3;
                totalWaktuCarousel += subtotalWaktu;

                carouselData.push({
                    description: row.item,
                    qty: qty,
                    kebutuhanSB: kebutuhanSB.toFixed(2),
                    c1: c1.toFixed(2),
                    calcC2: c2.toFixed(2),
                    calcPtu: calcPtu.toFixed(2),
                    calcPma: calcPma.toFixed(2),
                    calcC3: c3.toFixed(2),
                    varians: variansCarousel,
                    subtotalWaktu: subtotalWaktu.toFixed(2)
                });
            }

            // --- KALKULASI PACKING ---
            const cust = row.customer ? String(row.customer).toLowerCase() : '';
            const isRas = cust.includes('ras');
            const variansPacking = isRas ? 'Varians III' : 'Varians I';
            
            let ctPacking = isRas ? 0.15 : 0.47;
            const matchedPacking = matrixPacking.find(m => m.varians === variansPacking);
            if (matchedPacking) {
                ctPacking = Number(matchedPacking.cycle_time_menit);
            }


            let frekuensiPacking = 0;
            if (t > 0 && qty > 0) {
                if (row.originalQty !== undefined && qty === Number(row.originalQty) && t === Number(row.originalT) && row.packing_frekuensi_awal !== undefined) {
                    frekuensiPacking = row.packing_frekuensi_awal;
                } else {
                    frekuensiPacking = Math.ceil((t * qty) / 20);
                }
            }

            totalFrekuensiPacking += frekuensiPacking;

            const subtotalWaktuPacking = frekuensiPacking * ctPacking;
            totalWaktuPacking += subtotalWaktuPacking;

            packingData.push({
                description: row.item,
                qty: qty,
                kebutuhanSB: kebutuhanSB.toFixed(2),
                frekuensi: frekuensiPacking,
                varians: variansPacking,
                ctPacking: ctPacking.toFixed(2),
                subtotalWaktu: subtotalWaktuPacking.toFixed(2)
            });
        });

        const kapasitas1Shift = 420; // 7 jam

        const estBukaanVertikal = Math.ceil(totalWaktuVertikal / kapasitas1Shift);
        const utilVertikal = estBukaanVertikal > 0 ? (totalWaktuVertikal / (estBukaanVertikal * kapasitas1Shift)) * 100 : 0;
        const estOperatorVertikal = estBukaanVertikal * 3; // 3 orang per mesin vertikal

        const estBukaanHorizontal = Math.ceil(totalWaktuHorizontal / kapasitas1Shift);
        const utilHorizontal = estBukaanHorizontal > 0 ? (totalWaktuHorizontal / (estBukaanHorizontal * kapasitas1Shift)) * 100 : 0;
        const estOperatorHorizontal = estBukaanHorizontal * 1; // 1 orang per mesin horizontal

        const estBukaanCarousel = Math.ceil(totalWaktuCarousel / kapasitas1Shift);
        const utilCarousel = estBukaanCarousel > 0 ? (totalWaktuCarousel / (estBukaanCarousel * kapasitas1Shift)) * 100 : 0;
        const estOperatorCarousel = estBukaanCarousel * 1; // 1 orang per mesin carousel

        const utilPacking = totalWaktuPacking > 0 ? (totalWaktuPacking / kapasitas1Shift) * 100 : 0;

        res.json({
            vertikal: {
                data: vertikalData,
                summary: {
                    totalWaktu: totalWaktuVertikal.toFixed(2),
                    kapasitas1Shift: kapasitas1Shift,
                    estimasiBukaanMesin: estBukaanVertikal,
                    mesinTersedia: 3,
                    utilisasiMesin: utilVertikal.toFixed(2),
                    estimasiOperator: estOperatorVertikal
                }
            },
            horizontal: {
                data: horizontalData,
                summary: {
                    totalQty: totalQtyHorizontal,
                    totalWaktu: totalWaktuHorizontal.toFixed(2),
                    kapasitas1Shift: kapasitas1Shift,
                    estimasiBukaanMesin: estBukaanHorizontal,
                    mesinTersedia: 3,
                    utilisasiMesin: utilHorizontal.toFixed(2),
                    estimasiOperator: estOperatorHorizontal
                }
            },
            carousel: {
                data: carouselData,
                summary: {
                    totalQty: totalQtyCarousel,
                    totalWaktu: totalWaktuCarousel.toFixed(2),
                    kapasitas1Shift: kapasitas1Shift,
                    estimasiBukaanMesin: estBukaanCarousel,
                    mesinTersedia: 2,
                    utilisasiMesin: utilCarousel.toFixed(2),
                    estimasiOperator: estOperatorCarousel
                }
            },
            packing: {
                data: packingData,
                summary: {
                    totalFrekuensi: totalFrekuensiPacking,
                    totalWaktu: totalWaktuPacking.toFixed(2),
                    kapasitas1Shift: kapasitas1Shift,
                    estimasiBukaanMesin: 1, // Fixed area
                    mesinTersedia: 1,
                    utilisasiMesin: utilPacking.toFixed(2),
                    estimasiOperator: 7 // Fixed 7 manpower
                }
            }
        });

    } catch (error) {
        console.error('[ERROR] calculateSummary:', error);
        res.status(500).json({ message: 'Gagal melakukan kalkulasi mesin' });
    }
};

// Kalkulasi satu baris data (digunakan oleh form "Tambah SPK Manual")
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

// Update Tinggi Short Block Matrix
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
        res.status(500).json({ error: 'Failed to update database' });
    }
};

// ============================================================
// CONTROLLER: KALKULASI OEE (STRICT METHOD)
// ============================================================
exports.calculateOEE = async (req, res) => {
    try {
        const { 
            shift_time = 420, // 7 jam dalam menit
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

        // 1. Validasi ZeroDivisionError
        if (shift_time === 0 || efficiency === 0 || machine_qty === 0 || cycle_time_per_machine === 0 || total_input === 0) {
            return res.json({
                availability_pct: 0,
                performance_pct: 0,
                quality_pct: 0,
                oee_score_akhir: 0
            });
        }

        // 2. Kalkulasi Utama
        const availability_pct = ((shift_time - downtime) * efficiency) / (shift_time * efficiency);
        const performance_pct = operating_time / (machine_qty * cycle_time_per_machine);
        const quality_pct = 1 - (defect_qty / total_input);
        const oee_score_akhir = availability_pct * performance_pct * quality_pct;

        // Optional: Simpan ke tabel oee_metrics jika tipe_mesin dan tanggal dikirim
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

        // 3. Return Response (dalam bentuk percentage)
        res.json({
            availability_pct: availability_pct * 100,
            performance_pct: performance_pct * 100,
            quality_pct: quality_pct * 100,
            oee_score_akhir: oee_score_akhir * 100
        });

    } catch (error) {
        console.error('[ERROR] calculateOEE:', error);
        res.status(500).json({ message: 'Gagal melakukan kalkulasi OEE' });
    }
};

exports.getActiveWOs = async (req, res) => {
    try {
        const { tanggal } = req.query;
        let query = `
            SELECT 
                s.no_wo, 
                s.nama_item,
                s.ukuran_t, 
                s.qty_cutting,
                COALESCE(SUM(rc.hasil_qty), 0) as qty_terpenuhi
            FROM spk_items s
            LEFT JOIN upload_history u ON s.history_id = u.id
            LEFT JOIN realisasi_carousel rc ON s.no_wo = rc.no_wo AND rc.status = 'OK'
            WHERE s.no_wo IS NOT NULL AND s.no_wo != ''
        `;
        const queryParams = [];

        if (tanggal) {
            query += ` AND DATE(u.tanggal_upload) = ?`;
            queryParams.push(tanggal);
        }

        query += `
            GROUP BY s.no_wo, s.nama_item, s.ukuran_t, s.qty_cutting
        `;
        const [rows] = await db.query(query, queryParams);

        // Fetch fulfilled WOs independently so we can accurately check split WOs
        const [fulfilled] = await db.query(`
            SELECT no_wo, SUM(hasil_qty) as fulfilled_qty 
            FROM realisasi_carousel 
            WHERE status = 'OK' 
            GROUP BY no_wo
        `);
        const fulfilledMap = {};
        for (const f of fulfilled) {
            fulfilledMap[f.no_wo] = Number(f.fulfilled_qty);
        }

        const splitRows = [];
        for (const row of rows) {
            if (row.no_wo && row.no_wo.includes(',')) {
                const wos = row.no_wo.split(',').map(w => w.trim()).filter(Boolean);
                // Distribute qty_cutting equally among the split WOs
                const qtyPerWo = Math.max(1, Math.round(row.qty_cutting / wos.length));
                
                for (const wo of wos) {
                    const fQty = fulfilledMap[wo] || 0;
                    if (fQty < qtyPerWo) {
                        splitRows.push({
                            ...row,
                            no_wo: wo,
                            qty_cutting: qtyPerWo,
                            qty_terpenuhi: fQty
                        });
                    }
                }
            } else {
                const wo = row.no_wo ? row.no_wo.trim() : '';
                if (wo) {
                    const fQty = fulfilledMap[wo] || 0;
                    if (fQty < row.qty_cutting) {
                        splitRows.push({
                            ...row,
                            no_wo: wo,
                            qty_terpenuhi: fQty
                        });
                    }
                }
            }
        }

        res.json(splitRows);
    } catch (error) {
        console.error('[ERROR] getActiveWOs:', error);
        res.status(500).json({ message: 'Gagal mengambil data WO aktif' });
    }
};
