const db = require('../config/db');

exports.createRealisasi = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            // Identitas
            kualitas, no_barcode, tanggal, no_spk, nama_operator, shift, grup,
            asal_p, asal_l, asal_t, asal_qty, keterangan_kondisi,
            
            // Level 1 - Vertical
            no_mesin, hasil_p, hasil_l, hasil_t, hasil_qty,
            waste_samping_p, waste_samping_l, waste_samping_t, waste_samping_qty,
            waste_dpn_blk_p, waste_dpn_blk_l, waste_dpn_blk_t, waste_dpn_blk_qty,
            sisa_p, sisa_l, sisa_t, sisa_qty, sisa_keterangan,
            dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan,
            
            // Level 2 - Carousel/Horizontal (Array of objects)
            carousel_items
        } = req.body;

        // Validasi Kubikasi (Tinggi)
        let totalDemandT = 0;
        if (carousel_items && carousel_items.length > 0) {
            for (const item of carousel_items) {
                const itemTotalT = (Number(item.hasil2_t) * Number(item.hasil2_qty)) + 
                                   Number(item.waste_kulit_t) + 
                                   Number(item.waste_potong_t) + 
                                   Number(item.waste_produksi_t) + 
                                   Number(item.sispot_t);
                totalDemandT += itemTotalT;
            }
            if (totalDemandT > Number(hasil_t)) {
                await connection.rollback();
                return res.status(400).json({ 
                    message: `Kubikasi Gagal: Ketinggian demand (${totalDemandT.toFixed(2)}) melebihi tinggi SB Vertical (${Number(hasil_t).toFixed(2)})` 
                });
            }
        }

        // 1. Insert Identitas
        const [identitasResult] = await connection.query(
            `INSERT INTO realisasi_identitas 
            (kualitas, no_barcode, tanggal, no_spk, nama_operator, shift, grup, asal_p, asal_l, asal_t, asal_qty, keterangan_kondisi) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                kualitas || '', no_barcode || '', tanggal || null, no_spk || '', nama_operator || '', shift || '', grup || '',
                asal_p || 0, asal_l || 0, asal_t || 0, asal_qty || 0, keterangan_kondisi || ''
            ]
        );

        const identitasId = identitasResult.insertId;

        // 2. Insert Vertical
        await connection.query(
            `INSERT INTO realisasi_vertical 
            (identitas_id, no_mesin, hasil_p, hasil_l, hasil_t, hasil_qty, 
            waste_samping_p, waste_samping_l, waste_samping_t, waste_samping_qty,
            waste_dpn_blk_p, waste_dpn_blk_l, waste_dpn_blk_t, waste_dpn_blk_qty,
            sisa_p, sisa_l, sisa_t, sisa_qty, sisa_keterangan,
            dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                identitasId,
                no_mesin || '',
                hasil_p || 0, hasil_l || 0, hasil_t || 0, hasil_qty || 0,
                waste_samping_p || 0, waste_samping_l || 0, waste_samping_t || 0, waste_samping_qty || 0,
                waste_dpn_blk_p || 0, waste_dpn_blk_l || 0, waste_dpn_blk_t || 0, waste_dpn_blk_qty || 0,
                sisa_p || 0, sisa_l || 0, sisa_t || 0, sisa_qty || 0, sisa_keterangan || '',
                dt_kode || '', dt_jam_awal || null, dt_jam_akhir || null, dt_keterangan || ''
            ]
        );

        // 3. Insert Carousel/Horizontal Multiple
        if (carousel_items && carousel_items.length > 0) {
            for (const item of carousel_items) {
                await connection.query(
            `INSERT INTO realisasi_carousel 
            (identitas_id, no_mesin, tipe_mesin, no_disk, no_wo, keterangan, hasil_p, hasil_l, hasil_t, hasil_qty, status, alasan_reject,
            waste_kulit_t, waste_kulit_qty, 
            sispot_p, sispot_l, sispot_t, sispot_qty, sispot_keterangan,
            waste_potong_t, waste_potong_qty, 
            waste_produksi_t, waste_produksi_qty,
            dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                identitasId,
                item.no_mesin || '',
                item.tipe_mesin || 'Horizontal',
                item.no_disk || '',
                item.no_wo || '',
                item.keterangan || '',
                item.hasil2_p || 0, item.hasil2_l || 0, item.hasil2_t || 0, item.hasil2_qty || 0,
                item.status || 'OK', item.alasan_reject || '',
                item.waste_kulit_t || 0, item.waste_kulit_qty || 0,
                item.sispot_p || 0, item.sispot_l || 0, item.sispot_t || 0, item.sispot_qty || 0, item.sispot_keterangan || '',
                item.waste_potong_t || 0, item.waste_potong_qty || 0,
                item.waste_produksi_t || 0, item.waste_produksi_qty || 0,
                item.dt_kode || '', item.dt_jam_awal || null, item.dt_jam_akhir || null, item.dt_keterangan || ''
            ]
        );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Data realisasi berhasil disimpan!', id: identitasId });
    } catch (error) {
        await connection.rollback();
        console.error('[ERROR] createRealisasi:', error);
        res.status(500).json({ message: 'Gagal menyimpan data realisasi', error: error.message });
    } finally {
        connection.release();
    }
};

exports.getAllRealisasi = async (req, res) => {
    try {
        const query = `
            SELECT 
                i.id, i.kualitas, i.no_barcode, i.tanggal, i.no_spk, i.nama_operator, i.shift, i.grup,
                i.asal_p, i.asal_l, i.asal_t, i.asal_qty, i.keterangan_kondisi, i.created_at,
                
                v.no_mesin as v_no_mesin, v.hasil_p as v_hasil_p, v.hasil_l as v_hasil_l, v.hasil_t as v_hasil_t, v.hasil_qty as v_hasil_qty,
                v.waste_samping_p, v.waste_samping_l, v.waste_samping_t, v.waste_samping_qty,
                v.waste_dpn_blk_p, v.waste_dpn_blk_l, v.waste_dpn_blk_t, v.waste_dpn_blk_qty,
                v.sisa_p, v.sisa_l, v.sisa_t, v.sisa_qty, v.sisa_keterangan,
                v.dt_kode, v.dt_jam_awal, v.dt_jam_akhir, v.dt_keterangan,
                
                c.id as c_id, c.no_mesin as c_no_mesin, c.tipe_mesin, c.no_disk, c.no_wo, c.keterangan as c_keterangan, c.status, c.alasan_reject,
                c.hasil_p as c_hasil_p, c.hasil_l as c_hasil_l, c.hasil_t as c_hasil_t, c.hasil_qty as c_hasil_qty,
                c.waste_kulit_t, c.waste_kulit_qty,
                c.sispot_p, c.sispot_l, c.sispot_t, c.sispot_qty, c.sispot_keterangan,
                c.waste_potong_t, c.waste_potong_qty,
                c.waste_produksi_t, c.waste_produksi_qty
            FROM realisasi_identitas i
            LEFT JOIN realisasi_vertical v ON i.id = v.identitas_id
            LEFT JOIN realisasi_carousel c ON i.id = c.identitas_id
            ORDER BY i.created_at DESC
        `;
        
        const [rows] = await db.query(query);

        // Group rows by identitas_id
        const grouped = [];
        const map = new Map();

        for (const row of rows) {
            if (!map.has(row.id)) {
                const newRow = { ...row, carousel_items: [] };
                // Clean up prefixed c_ fields from root
                delete newRow.c_id; delete newRow.c_no_mesin; delete newRow.tipe_mesin; delete newRow.no_disk; delete newRow.no_wo; delete newRow.c_keterangan; delete newRow.status; delete newRow.alasan_reject;
                delete newRow.c_hasil_p; delete newRow.c_hasil_l; delete newRow.c_hasil_t; delete newRow.c_hasil_qty;
                delete newRow.waste_kulit_t; delete newRow.waste_kulit_qty; delete newRow.sispot_p; delete newRow.sispot_l; delete newRow.sispot_t; delete newRow.sispot_qty; delete newRow.sispot_keterangan;
                delete newRow.waste_potong_t; delete newRow.waste_potong_qty; delete newRow.waste_produksi_t; delete newRow.waste_produksi_qty;
                
                map.set(row.id, newRow);
                grouped.push(newRow);
            }
            
            if (row.c_id) {
                map.get(row.id).carousel_items.push({
                    id: row.c_id,
                    no_mesin: row.c_no_mesin,
                    tipe_mesin: row.tipe_mesin,
                    no_disk: row.no_disk,
                    no_wo: row.no_wo,
                    keterangan: row.c_keterangan,
                    status: row.status,
                    alasan_reject: row.alasan_reject,
                    hasil_p: row.c_hasil_p,
                    hasil_l: row.c_hasil_l,
                    hasil_t: row.c_hasil_t,
                    hasil_qty: row.c_hasil_qty,
                    waste_kulit_t: row.waste_kulit_t,
                    waste_kulit_qty: row.waste_kulit_qty,
                    sispot_p: row.sispot_p,
                    sispot_l: row.sispot_l,
                    sispot_t: row.sispot_t,
                    sispot_qty: row.sispot_qty,
                    sispot_keterangan: row.sispot_keterangan,
                    waste_potong_t: row.waste_potong_t,
                    waste_potong_qty: row.waste_potong_qty,
                    waste_produksi_t: row.waste_produksi_t,
                    waste_produksi_qty: row.waste_produksi_qty
                });
            }
        }

        res.json(grouped);
    } catch (error) {
        console.error('[ERROR] getAllRealisasi:', error);
        res.status(500).json({ message: 'Gagal mengambil data realisasi' });
    }
};

exports.updateRealisasi = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            // Identitas
            kualitas, no_barcode, tanggal, no_spk, nama_operator, shift,
            asal_p, asal_l, asal_t, asal_qty, keterangan_kondisi,
            
            // Level 1 - Vertical
            hasil_p, hasil_l, hasil_t, hasil_qty,
            waste_samping_p, waste_samping_l, waste_samping_t, waste_samping_qty,
            sisa_p, sisa_l, sisa_t, sisa_qty,
            dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan,
            
            // Level 2 - Carousel/Horizontal (Array of objects)
            carousel_items
        } = req.body;

        // Validasi Kubikasi
        let totalDemandT = 0;
        if (carousel_items && carousel_items.length > 0) {
            for (const item of carousel_items) {
                totalDemandT += (Number(item.hasil2_t || item.hasil_t || 0) * Number(item.hasil2_qty || item.hasil_qty || 0)) + 
                                Number(item.waste_kulit_t || 0) + Number(item.waste_potong_t || 0) + 
                                Number(item.waste_produksi_t || 0) + Number(item.sispot_t || 0);
            }
            if (totalDemandT > Number(hasil_t)) {
                await connection.rollback();
                return res.status(400).json({ 
                    message: `Kubikasi Gagal: Ketinggian demand (${totalDemandT.toFixed(2)}) melebihi tinggi SB Vertical (${Number(hasil_t).toFixed(2)})` 
                });
            }
        }

        // 1. Update Identitas
        await connection.query(
            `UPDATE realisasi_identitas SET 
            kualitas=?, no_barcode=?, tanggal=?, no_spk=?, nama_operator=?, shift=?, grup=?, 
            asal_p=?, asal_l=?, asal_t=?, asal_qty=?, keterangan_kondisi=? WHERE id=?`,
            [
                kualitas || '', no_barcode || '', tanggal || null, no_spk || '', nama_operator || '', shift || '', grup || '',
                asal_p || 0, asal_l || 0, asal_t || 0, asal_qty || 0, keterangan_kondisi || '',
                id
            ]
        );

        // 2. Update Vertical
        await connection.query(
            `UPDATE realisasi_vertical SET 
            no_mesin=?, hasil_p=?, hasil_l=?, hasil_t=?, hasil_qty=?, 
            waste_samping_p=?, waste_samping_l=?, waste_samping_t=?, waste_samping_qty=?,
            waste_dpn_blk_p=?, waste_dpn_blk_l=?, waste_dpn_blk_t=?, waste_dpn_blk_qty=?,
            sisa_p=?, sisa_l=?, sisa_t=?, sisa_qty=?, sisa_keterangan=?,
            dt_kode=?, dt_jam_awal=?, dt_jam_akhir=?, dt_keterangan=? WHERE identitas_id=?`,
            [
                no_mesin || '',
                hasil_p || 0, hasil_l || 0, hasil_t || 0, hasil_qty || 0,
                waste_samping_p || 0, waste_samping_l || 0, waste_samping_t || 0, waste_samping_qty || 0,
                waste_dpn_blk_p || 0, waste_dpn_blk_l || 0, waste_dpn_blk_t || 0, waste_dpn_blk_qty || 0,
                sisa_p || 0, sisa_l || 0, sisa_t || 0, sisa_qty || 0, sisa_keterangan || '',
                dt_kode || '', dt_jam_awal || null, dt_jam_akhir || null, dt_keterangan || '',
                id
            ]
        );

        // 3. Update Carousel (Hapus lama, Insert baru)
        await connection.query(`DELETE FROM realisasi_carousel WHERE identitas_id=?`, [id]);
        
        if (carousel_items && carousel_items.length > 0) {
            for (const item of carousel_items) {
                await connection.query(
                    `INSERT INTO realisasi_carousel 
                    (identitas_id, no_mesin, tipe_mesin, no_disk, no_wo, keterangan, hasil_p, hasil_l, hasil_t, hasil_qty, status, alasan_reject,
                    waste_kulit_t, waste_kulit_qty, sispot_p, sispot_l, sispot_t, sispot_qty, sispot_keterangan,
                    waste_potong_t, waste_potong_qty, waste_produksi_t, waste_produksi_qty,
                    dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        item.no_mesin || '',
                        item.tipe_mesin || 'Horizontal', item.no_disk || '', item.no_wo || '', item.keterangan || '',
                        item.hasil2_p || item.hasil_p || 0, item.hasil2_l || item.hasil_l || 0, item.hasil2_t || item.hasil_t || 0, item.hasil2_qty || item.hasil_qty || 0,
                        item.status || 'OK', item.alasan_reject || '',
                        item.waste_kulit_t || 0, item.waste_kulit_qty || 0,
                        item.sispot_p || 0, item.sispot_l || 0, item.sispot_t || 0, item.sispot_qty || 0, item.sispot_keterangan || '',
                        item.waste_potong_t || 0, item.waste_potong_qty || 0,
                        item.waste_produksi_t || 0, item.waste_produksi_qty || 0,
                        item.dt_kode || '', item.dt_jam_awal || null, item.dt_jam_akhir || null, item.dt_keterangan || ''
                    ]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Data realisasi berhasil diupdate!' });
    } catch (error) {
        await connection.rollback();
        console.error('[ERROR] updateRealisasi:', error);
        res.status(500).json({ message: 'Gagal mengupdate data realisasi', error: error.message });
    } finally {
        connection.release();
    }
};

exports.deleteRealisasi = async (req, res) => {
    const { id } = req.params;
    try {
        // Karena ada ON DELETE CASCADE, tabel terkait (vertical & carousel) otomatis terhapus
        const [result] = await db.query(`DELETE FROM realisasi_identitas WHERE id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan' });
        }
        res.json({ message: 'Data realisasi berhasil dihapus!' });
    } catch (error) {
        console.error('[ERROR] deleteRealisasi:', error);
        res.status(500).json({ message: 'Gagal menghapus data realisasi', error: error.message });
    }
};
