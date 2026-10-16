const db = require('../config/db');

// ─── AMBIL DATA DASHBOARD PLANNING ───
exports.getDashboardData = async (req, res) => {
    try {
        const { history_id, all, date } = req.query;
        let historyRows = [];
        let currentSpkName = 'Tidak Ada Data SPK';
        
        if (all === 'true') {
            // Ambil SELURUH SPK yang pernah diunggah
            const [rows] = await db.query('SELECT * FROM upload_history');
            historyRows = rows;
            currentSpkName = 'Semua Hari (Keseluruhan)';
        } else if (date) {
            // Ambil berdasarkan tanggal spesifik
            const [rows] = await db.query('SELECT * FROM upload_history WHERE DATE(tanggal_upload) = ?', [date]);
            historyRows = rows;
            currentSpkName = `SPK Tanggal ${date}`;
        } else if (history_id) {
            // Ambil berdasarkan history_id spesifik
            const [rows] = await db.query('SELECT * FROM upload_history WHERE id = ?', [history_id]);
            historyRows = rows;
            if (historyRows.length > 0) currentSpkName = historyRows[0].nama_file;
        } else {
            // Ambil SPK TERAKHIR yang pernah diunggah
            const [rows] = await db.query('SELECT * FROM upload_history ORDER BY id DESC LIMIT 1');
            historyRows = rows;
            if (historyRows.length > 0) currentSpkName = historyRows[0].nama_file;
        }

        let woAktif = 0;
        let totalMesin = 0;
        let totalManpower = 0;
        let totalShortBlock = 0;
        let totalWaktuMenit = 0;
        let planningData = [];
        let inefficientSpkCount = 0;

        let mesinBreakdown = { Vertikal: 0, Horizontal: 0, Carousel: 0 };
        let waktuBreakdown = { Vertikal: 0, Horizontal: 0, Carousel: 0 };

        if (historyRows.length > 0) {
            const allIds = historyRows.map(r => r.id);

            // Hitung total mesin unik dan total manpower dari JSON mesin_digunakan
            historyRows.forEach(h => {
                let mesinData = null;
                try { mesinData = JSON.parse(h.mesin_digunakan); } catch(e){}
                
                if (Array.isArray(mesinData)) {
                    // Fallback untuk history lama
                    mesinData.forEach(m => {
                        totalMesin += 1;
                        totalManpower += 1; // dummy fallback
                    });
                } else if (mesinData && typeof mesinData === 'object') {
                    for (const [key, data] of Object.entries(mesinData)) {
                        if (key === 'CNC' || key === 'Perforasi') continue; // Hide from total if needed, or adjust
                        
                        if (data.totalQty > 0 || data.totalWaktu > 0) {
                            const mesinDibutuhkan = Number(data.mesinDibutuhkan) || 0;
                            totalMesin += mesinDibutuhkan;
                            totalManpower += Number(data.manpowerDibutuhkan) || 0;

                            if (key.toLowerCase().includes('vertikal')) mesinBreakdown.Vertikal += mesinDibutuhkan;
                            else if (key.toLowerCase().includes('horizontal') || key.toLowerCase().includes('hz')) mesinBreakdown.Horizontal += mesinDibutuhkan;
                            else if (key.toLowerCase().includes('carousel') || key.toLowerCase().includes('cr')) mesinBreakdown.Carousel += mesinDibutuhkan;
                        }
                    }
                }
            });

            // Ambil semua item SPK hari ini
            const [items] = await db.query(`
                SELECT 
                    s.id AS item_id, s.no_wo, s.nama_item, s.qty, s.estimasi_waktu_menit, s.history_id, s.tipe_mesin,
                    s.prediksi_sb, s.customer, s.ukuran_p, s.ukuran_l, s.ukuran_t, s.tinggi_balokan,
                    h.mesin_digunakan, h.tanggal_upload, h.shift
                FROM spk_items s
                LEFT JOIN upload_history h ON s.history_id = h.id
                WHERE s.history_id IN (?)
                ORDER BY s.id ASC
            `, [allIds]);

            // Ambil referensi cycle time untuk mencari CT
            const [matrix] = await db.query('SELECT nama_item, cycle_time_menit, tipe_mesin FROM cycle_time_matrix');
            const sortedMatrix = matrix.sort((a, b) => b.nama_item.length - a.nama_item.length);

            totalShortBlock = 0;
            totalWaktuMenit = 0;
            const seenItemIds = new Set();
            const uniqueWOs = new Set();
            
            // Menghitung ulang kebutuhan waktu dan block dari items yang unik
            items.forEach(item => {
                const qty = parseFloat(item.qty) || 0;
                const sb = parseFloat(item.prediksi_sb) || 0;
                const estWaktu = parseFloat(item.estimasi_waktu_menit) || 0;
                
                if (!seenItemIds.has(item.item_id)) {
                    totalShortBlock += sb;
                    seenItemIds.add(item.item_id);
                    
                    if (item.no_wo && item.no_wo !== '-') {
                        const wos = item.no_wo.split(',').map(w => w.trim()).filter(w => w);
                        wos.forEach(w => uniqueWOs.add(w));
                    }
                }
            });

            // Hitung total waktu dari penjumlahan semua waktu per mesin di historyRows
            historyRows.forEach(h => {
                let mesinData = null;
                try { mesinData = JSON.parse(h.mesin_digunakan); } catch(e){}
                
                if (mesinData && typeof mesinData === 'object' && !Array.isArray(mesinData)) {
                    for (const [key, data] of Object.entries(mesinData)) {
                        const w = Number(data.totalWaktu) || 0;
                        totalWaktuMenit += w;

                        if (key.toLowerCase().includes('vertikal')) waktuBreakdown.Vertikal += w;
                        else if (key.toLowerCase().includes('horizontal') || key.toLowerCase().includes('hz')) waktuBreakdown.Horizontal += w;
                        else if (key.toLowerCase().includes('carousel') || key.toLowerCase().includes('cr')) waktuBreakdown.Carousel += w;
                    }
                }
            });

            inefficientSpkCount = 0; // Kita abaikan dulu atau bisa dihitung ulang nanti

            // Agregasi planningData per nama_item
            const groupedItems = {};
            const seenItemIds2 = new Set();

            items.forEach(item => {
                const estWaktu = parseFloat(item.estimasi_waktu_menit) || 0;
                const cleanItemName = item.nama_item.replace(/\s*\([\d.x]+\)\s*$/, '').replace(/\s+/g, '').toLowerCase();
                
                // Cari CT dari matrix
                let matchedItem = sortedMatrix.find(m => {
                    const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                    return dbNameNoSpace === cleanItemName && m.tipe_mesin === item.tipe_mesin;
                });
                
                if (!matchedItem) {
                    matchedItem = sortedMatrix.find(m => {
                        const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                        return cleanItemName.includes(dbNameNoSpace) && m.tipe_mesin === item.tipe_mesin;
                    });
                }

                const rawCt = matchedItem ? Number(matchedItem.cycle_time_menit) : 0;
                
                let isAnomaly = false;
                if (rawCt === 0 || estWaktu === 0) {
                    isAnomaly = true;
                }

                if (!groupedItems[item.nama_item]) {
                    let tipeMesinLabel = item.tipe_mesin || '-';
                    if (tipeMesinLabel.toLowerCase().includes('vertikal')) tipeMesinLabel = 'Vertikal';
                    else if (tipeMesinLabel.toLowerCase().includes('horizontal')) tipeMesinLabel = 'Horizontal';
                    else if (tipeMesinLabel.toLowerCase().includes('carousel')) tipeMesinLabel = 'Carousel';

                    groupedItems[item.nama_item] = {
                        item: item.nama_item,
                        customer: item.customer || '-',
                        ukuran_p: item.ukuran_p || 0,
                        ukuran_l: item.ukuran_l || 0,
                        ukuran_t: item.ukuran_t || 0,
                        tinggi_balokan: item.tinggi_balokan || 60,
                        tipe_mesin: tipeMesinLabel,
                        qty: 0,
                        waktuNum: 0,
                        kebutuhan_sb: 0,
                        varians: '-',
                        ctNum: rawCt,
                        ct: rawCt > 0 ? `${rawCt} dtk` : '0 dtk',
                        isAnomaly: isAnomaly
                    };
                }

                if (!seenItemIds2.has(item.item_id)) {
                    groupedItems[item.nama_item].qty += (parseFloat(item.qty) || 0);
                    groupedItems[item.nama_item].waktuNum += estWaktu;
                    groupedItems[item.nama_item].kebutuhan_sb += (parseFloat(item.prediksi_sb) || 0);
                    seenItemIds2.add(item.item_id);
                }
                
                if (isAnomaly) {
                    groupedItems[item.nama_item].isAnomaly = true;
                }
            });

            planningData = Object.values(groupedItems).map(g => ({
                id: '-', 
                item: g.item,
                customer: g.customer,
                ukuran_p: g.ukuran_p,
                ukuran_l: g.ukuran_l,
                ukuran_t: g.ukuran_t,
                tinggi_balokan: g.tinggi_balokan,
                tipe_mesin: g.tipe_mesin,
                qty: Number(g.qty.toFixed(2)),
                kebutuhan_sb: Number(g.kebutuhan_sb.toFixed(4)),
                varians: g.varians,
                ctNum: g.ctNum,
                ct: g.ct,
                waktuNum: g.waktuNum,
                waktu: `${Math.round(g.waktuNum)} Menit`,
                mesin: '-',
                mp: 0,
                shift: '-',
                isAnomaly: g.isAnomaly
            }));

            woAktif = uniqueWOs.size;
        }

        const metrics = {
            woAktif,
            mesinDibutuhkan: totalMesin,
            manpowerDibutuhkan: totalManpower,
            shortBlock: Number(totalShortBlock.toFixed(2)),
            waktuSpk: `${Math.round(totalWaktuMenit / 60)} Jam ${Math.round(totalWaktuMenit % 60)} Menit`,
            mesinBreakdown,
            waktuBreakdown,
            anomalyCount: inefficientSpkCount
        };

        const [dateRows] = await db.query(
            "SELECT DISTINCT DATE_FORMAT(tanggal_upload, '%Y-%m-%d') as tanggal FROM upload_history ORDER BY tanggal DESC"
        );
        const availableDates = dateRows.map(r => r.tanggal);

        res.json({ metrics, planningData, currentSpkName, availableDates });
    } catch (err) {
        console.error('[ERROR] getDashboardData:', err);
        res.status(500).json({ message: 'Gagal memuat data dashboard planning' });
    }
};

