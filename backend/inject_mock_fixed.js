const mysql = require('mysql2/promise');

(async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'dashboard_vertikal'
        });

        // 1. CLEAR the previous wrongly injected mock data
        console.log("Cleaning up previous wrong injections...");
        await connection.query(`
            DELETE c, v, i 
            FROM realisasi_identitas i
            LEFT JOIN realisasi_carousel c ON c.identitas_id = i.id
            LEFT JOIN realisasi_vertical v ON v.identitas_id = i.id
            WHERE i.nama_operator = 'Bot Injector'
        `);
        console.log("Cleanup done.");

        // 2. Fetch SPK items
        const [spkItems] = await connection.query(`
            SELECT s.*, h.tanggal_upload as tanggal 
            FROM spk_items s
            JOIN upload_history h ON s.history_id = h.id
            WHERE h.tanggal_upload >= '2026-10-01'
        `);

        // 3. Get realized WOs
        const [realized] = await connection.query(`
            SELECT no_wo, SUM(hasil_qty) as total_real 
            FROM realisasi_carousel 
            WHERE status != 'DRAFT'
            GROUP BY no_wo
        `);

        const realizedMap = {};
        realized.forEach(r => {
            realizedMap[r.no_wo] = (realizedMap[r.no_wo] || 0) + Number(r.total_real);
        });

        let injectedCount = 0;

        for (const item of spkItems) {
            // SPK item might have grouped WOs like '4145776, 4145781'
            const noWoGroup = item.no_wo || '';
            const targetQtyTotal = Number(item.qty_cutting || 0);
            
            // To be accurate, we'll check if the group as a whole needs fulfillment.
            // If it's a grouped WO string, we check the first WO in the DB just as an approximation,
            // or we just check the whole string if they are inserted together.
            
            // Wait, the user said "untuk dimensi sesuaikan dengan keinginan cutting per wo nya, untuk tinggi kan kita input manual di bahan baku asal itu pukul rata aja 100".
            // So we will create ONE identitas, ONE vertical, and MULTIPLE carousel items (if grouped).
            
            const wos = noWoGroup.split(',').map(w => w.trim()).filter(Boolean);
            
            // If they are grouped, targetQty is the sum. Let's just divide the qty equally for the mock,
            // OR since we are just mocking the total, we assign targetQtyTotal/wos.length to each.
            
            // Let's check if this group is already fully realized
            // The grouped WO might be partially realized per WO.
            let currentRealTotal = 0;
            wos.forEach(wo => {
                currentRealTotal += (realizedMap[wo] || 0);
            });

            if (currentRealTotal < targetQtyTotal) {
                const missingQty = targetQtyTotal - currentRealTotal;
                
                const d = new Date(item.tanggal);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                
                const barcode = 'MOCK' + String(Date.now()).slice(-6);

                // Create an identitas record
                const [identitasResult] = await connection.query(`
                    INSERT INTO realisasi_identitas 
                    (kualitas, tanggal, no_barcode, no_spk, nama_operator, shift, grup, asal_p, asal_l, asal_t, asal_qty, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    item.kualitas_busa,
                    dateStr,
                    barcode,
                    item.no_spk || 'MOCK-SPK',
                    'Bot Injector',
                    'Shift 1',
                    'Group A',
                    item.ukuran_p, item.ukuran_l, 100, 1, // Mock asal_t = 100
                    'SUBMITTED'
                ]);

                const identitasId = identitasResult.insertId;

                // Create a vertical record
                await connection.query(`
                    INSERT INTO realisasi_vertical 
                    (identitas_id, no_mesin, hasil_p, hasil_l, hasil_t, hasil_qty) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    identitasId,
                    'V1',
                    item.ukuran_p, item.ukuran_l, 100, 1
                ]);

                // Create carousel records per WO
                const qtyPerWo = Math.floor(missingQty / wos.length);
                const remainder = missingQty % wos.length;

                for (let i = 0; i < wos.length; i++) {
                    const wo = wos[i];
                    const qtyToInsert = qtyPerWo + (i === 0 ? remainder : 0);
                    
                    if (qtyToInsert > 0) {
                        await connection.query(`
                            INSERT INTO realisasi_carousel
                            (identitas_id, tipe_mesin, no_mesin, no_wo, tanggal_wo, hasil_p, hasil_l, hasil_t, hasil_qty, status, source_block)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            identitasId,
                            'Horizontal',
                            'H1',
                            wo,
                            dateStr,
                            item.ukuran_p,
                            item.ukuran_l,
                            item.ukuran_t,
                            qtyToInsert,
                            'OK',
                            'Utama'
                        ]);
                    }
                }

                injectedCount++;
                console.log(`Injected Group ${noWoGroup}: +${missingQty} qty`);
            }
        }

        console.log(`Finished injecting ${injectedCount} records.`);

    } catch (err) {
        console.error(err);
    } finally {
        if (connection) await connection.end();
    }
})();
