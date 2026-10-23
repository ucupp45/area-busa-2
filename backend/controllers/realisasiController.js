const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

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
            waste_produksi_p, waste_produksi_l, waste_produksi_t, waste_produksi_qty,
            sisa_p, sisa_l, sisa_t, sisa_qty, sisa_keterangan,
            dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan,
            sisa_potong_id_used,
            
            // Level 2 - Carousel/Horizontal (Array of objects)
            carousel_items,
            status = 'SUBMITTED' // DRAFT atau SUBMITTED
        } = req.body;

        // Validasi Kubikasi (Tinggi) - BYPASS JIKA DRAFT
        if (status !== 'DRAFT' && carousel_items && carousel_items.length > 0) {
            let totalDemandT_Utama = 0;
            let totalDemandT_Sispot = 0;
            
            for (const item of carousel_items) {
                const itemTotalT = (Number(item.hasil2_t || 0) * Number(item.hasil2_qty || 0)) + 
                                   (Number(item.waste_kulit_t || 0) * Number(item.waste_kulit_qty || 1)) + 
                                   (Number(item.waste_potong_t || 0) * Number(item.waste_potong_qty || 1)) + 
                                   (Number(item.waste_produksi_t || 0) * Number(item.waste_produksi_qty || 1)) + 
                                   (Number(item.sispot_t || 0) * Number(item.sispot_qty || 1));
                
                if (item.source_block === 'Sispot') {
                    totalDemandT_Sispot += itemTotalT;
                    // Validate L rotation
                    const sispotTinggi = Number(sisa_t || 0);
                    if (Number(item.hasil2_l || item.hasil_l || 0) > sispotTinggi + 0.001) {
                        await connection.rollback();
                        return res.status(400).json({ 
                            message: `Validasi Gagal: Lebar demand WO Sispot melebihi Tinggi Sispot (${sispotTinggi} cm).` 
                        });
                    }
                } else {
                    totalDemandT_Utama += itemTotalT;
                }
            }

            const sbHeightUtama = Number(hasil_t || 0) * Number(hasil_qty || 1);
            const sbHeightSispot = Number(sisa_l || 0) * Number(sisa_qty || 1);

            if (totalDemandT_Utama > sbHeightUtama + 0.01) {
                await connection.rollback();
                return res.status(400).json({ 
                    message: `Kubikasi Gagal: Ketinggian demand Utama (${totalDemandT_Utama.toFixed(2)} cm) melebihi tinggi SB Vertical (${sbHeightUtama.toFixed(2)} cm)` 
                });
            } else if (sbHeightUtama > 0 && totalDemandT_Utama < sbHeightUtama - 0.01 && totalDemandT_Sispot > 0) {
                // If they use Sispot, Utama MUST be fully consumed first
                await connection.rollback();
                return res.status(400).json({ 
                    message: `Validasi Gagal: Masih ada sisa ketinggian Utama (${(sbHeightUtama - totalDemandT_Utama).toFixed(2)} cm). Harap habiskan Hasil Utama sebelum memotong Sispot.` 
                });
            }

            if (totalDemandT_Sispot > sbHeightSispot + 0.01) {
                await connection.rollback();
                return res.status(400).json({ 
                    message: `Kubikasi Gagal: Ketinggian demand Sispot (${totalDemandT_Sispot.toFixed(2)} cm) melebihi ketersediaan Sispot (${sbHeightSispot.toFixed(2)} cm)` 
                });
            }

        }

        // 1. Insert Identitas
        const [identitasResult] = await connection.query(
            `INSERT INTO realisasi_identitas 
            (kualitas, no_barcode, tanggal, no_spk, nama_operator, shift, grup, asal_p, asal_l, asal_t, asal_qty, keterangan_kondisi, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                kualitas || '', no_barcode || '', tanggal || null, no_spk || '', nama_operator || '', shift || '', grup || '',
                asal_p || 0, asal_l || 0, asal_t || 0, asal_qty || 0, keterangan_kondisi || '', status
            ]
        );

        const identitasId = identitasResult.insertId;

        // 2. Insert Vertical
        await connection.query(
            `INSERT INTO realisasi_vertical 
            (identitas_id, no_mesin, hasil_p, hasil_l, hasil_t, hasil_qty, 
            waste_samping_p, waste_samping_l, waste_samping_t, waste_samping_qty,
            waste_dpn_blk_p, waste_dpn_blk_l, waste_dpn_blk_t, waste_dpn_blk_qty,
            waste_produksi_p, waste_produksi_l, waste_produksi_t, waste_produksi_qty,
            sisa_p, sisa_l, sisa_t, sisa_qty, sisa_keterangan,
            dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan, sisa_potong_id_used) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                identitasId,
                no_mesin || '',
                hasil_p || 0, hasil_l || 0, hasil_t || 0, hasil_qty || 0,
                waste_samping_p || 0, waste_samping_l || 0, waste_samping_t || 0, waste_samping_qty || 0,
                waste_dpn_blk_p || 0, waste_dpn_blk_l || 0, waste_dpn_blk_t || 0, waste_dpn_blk_qty || 0,
                waste_produksi_p || 0, waste_produksi_l || 0, waste_produksi_t || 0, waste_produksi_qty || 0,
                sisa_p || 0, sisa_l || 0, sisa_t || 0, sisa_qty || 0, sisa_keterangan || '',
                dt_kode || '', dt_jam_awal || null, dt_jam_akhir || null, dt_keterangan || '', sisa_potong_id_used || null
            ]
        );

        // 3. Insert Carousel/Horizontal Multiple
        if (carousel_items && carousel_items.length > 0) {
            for (const item of carousel_items) {
                await connection.query(
            `INSERT INTO realisasi_carousel 
            (identitas_id, no_mesin, tipe_mesin, no_disk, tanggal_wo, no_wo, keterangan, source_block, hasil_p, hasil_l, hasil_t, hasil_qty, status, alasan_reject,
            waste_kulit_p, waste_kulit_l, waste_kulit_t, waste_kulit_qty, 
            sispot_p, sispot_l, sispot_t, sispot_qty, sispot_keterangan,
            waste_potong_p, waste_potong_l, waste_potong_t, waste_potong_qty, 
            waste_produksi_p, waste_produksi_l, waste_produksi_t, waste_produksi_qty, waste_produksi_keterangan,
            dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                identitasId,
                item.no_mesin || '',
                item.tipe_mesin || 'Horizontal',
                item.no_disk || '',
                item.tanggal_wo || null,
                item.no_wo || '',
                item.keterangan || '',
                item.source_block || 'Utama',
                item.hasil2_p || 0, item.hasil2_l || 0, item.hasil2_t || 0, item.hasil2_qty || 0,
                item.status || 'OK', item.alasan_reject || '',
                item.waste_kulit_p || 0, item.waste_kulit_l || 0, item.waste_kulit_t || 0, item.waste_kulit_qty || 0,
                item.sispot_p || 0, item.sispot_l || 0, item.sispot_t || 0, item.sispot_qty || 0, item.sispot_keterangan || '',
                item.waste_potong_p || 0, item.waste_potong_l || 0, item.waste_potong_t || 0, item.waste_potong_qty || 0,
                item.waste_produksi_p || 0, item.waste_produksi_l || 0, item.waste_produksi_t || 0, item.waste_produksi_qty || 0, item.waste_produksi_keterangan || '',
                item.dt_kode || '', item.dt_jam_awal || null, item.dt_jam_akhir || null, item.dt_keterangan || ''
            ]
        );
            }
        }
        // 4. Insert Sisa Potong ke stok_sisa_potong jika status = SUBMITTED
        if (status === 'SUBMITTED' && no_barcode) {
            if (Number(sisa_t) > 0 && Number(sisa_qty) > 0) {
                await connection.query(`
                    INSERT INTO stok_sisa_potong (identitas_id, no_barcode, kualitas, sumber_potong, p, l, t, qty)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [identitasId, no_barcode, kualitas, 'Vertical', sisa_p || 0, sisa_l || 0, sisa_t || 0, sisa_qty || 0]);
            }
            if (carousel_items && carousel_items.length > 0) {
                for (const item of carousel_items) {
                    if (Number(item.sispot_t) > 0 && Number(item.sispot_qty) > 0) {
                        await connection.query(`
                            INSERT INTO stok_sisa_potong (identitas_id, no_barcode, kualitas, sumber_potong, p, l, t, qty)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [identitasId, no_barcode, kualitas, 'Horizontal', item.sispot_p || 0, item.sispot_l || 0, item.sispot_t || 0, item.sispot_qty || 0]);
                    }
                }
            }
        }
        // Mark Sisa Potong as used if provided and submitted
        if (status === 'SUBMITTED' && sisa_potong_id_used) {
            await connection.query('UPDATE stok_sisa_potong SET is_used = TRUE WHERE id = ?', [sisa_potong_id_used]);
        }

        await connection.commit();

        // Catat Audit Trail
        await logAudit(req, {
            action: 'CREATE_REALISASI',
            targetEntity: 'realisasi_identitas',
            targetId: identitasId,
            details: {
                no_barcode: no_barcode || '',
                kualitas: kualitas || '',
                nama_operator: nama_operator || '',
                tanggal: tanggal || null,
                shift: shift || '',
                status
            }
        });

        res.status(201).json({ message: 'Data realisasi berhasil disimpan!', id: identitasId });
    } catch (error) {
        await connection.rollback();
        console.error('[ERROR] createRealisasi:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan data realisasi.' });
    } finally {
        connection.release();
    }
};

exports.getAllRealisasi = async (req, res) => {
    try {
        const query = `
            SELECT 
                i.id, i.kualitas, i.no_barcode, i.tanggal, i.no_spk, i.nama_operator, i.shift, i.grup,
                i.asal_p, i.asal_l, i.asal_t, i.asal_qty, i.keterangan_kondisi, i.status as identitas_status, i.created_at,
                
                v.no_mesin as v_no_mesin, v.hasil_p as v_hasil_p, v.hasil_l as v_hasil_l, v.hasil_t as v_hasil_t, v.hasil_qty as v_hasil_qty,
                v.waste_samping_p, v.waste_samping_l, v.waste_samping_t, v.waste_samping_qty,
                v.waste_dpn_blk_p, v.waste_dpn_blk_l, v.waste_dpn_blk_t, v.waste_dpn_blk_qty,
                v.waste_produksi_p, v.waste_produksi_l, v.waste_produksi_t, v.waste_produksi_qty,
                v.sisa_p, v.sisa_l, v.sisa_t, v.sisa_qty, v.sisa_keterangan,
                v.dt_kode, v.dt_jam_awal, v.dt_jam_akhir, v.dt_keterangan, v.sisa_potong_id_used,
                
                c.id as c_id, c.no_mesin as c_no_mesin, c.tipe_mesin, c.no_disk, c.tanggal_wo, c.no_wo, c.keterangan as c_keterangan, c.status, c.alasan_reject,
                c.hasil_p as c_hasil_p, c.hasil_l as c_hasil_l, c.hasil_t as c_hasil_t, c.hasil_qty as c_hasil_qty,
                c.waste_kulit_p, c.waste_kulit_l, c.waste_kulit_t, c.waste_kulit_qty,
                c.sispot_p, c.sispot_l, c.sispot_t, c.sispot_qty, c.sispot_keterangan,
                c.waste_potong_p, c.waste_potong_l, c.waste_potong_t, c.waste_potong_qty,
                c.waste_produksi_p, c.waste_produksi_l, c.waste_produksi_t, c.waste_produksi_qty, c.waste_produksi_keterangan
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
                delete newRow.c_id; delete newRow.c_no_mesin; delete newRow.tipe_mesin; delete newRow.no_disk; delete newRow.tanggal_wo; delete newRow.no_wo; delete newRow.c_keterangan; delete newRow.status; delete newRow.alasan_reject;
                delete newRow.c_hasil_p; delete newRow.c_hasil_l; delete newRow.c_hasil_t; delete newRow.c_hasil_qty;
                delete newRow.waste_kulit_p; delete newRow.waste_kulit_l; delete newRow.waste_kulit_t; delete newRow.waste_kulit_qty; 
                delete newRow.sispot_p; delete newRow.sispot_l; delete newRow.sispot_t; delete newRow.sispot_qty; delete newRow.sispot_keterangan;
                delete newRow.waste_potong_p; delete newRow.waste_potong_l; delete newRow.waste_potong_t; delete newRow.waste_potong_qty; 
                delete newRow.waste_produksi_p; delete newRow.waste_produksi_l; delete newRow.waste_produksi_t; delete newRow.waste_produksi_qty; delete newRow.waste_produksi_keterangan;
                
                map.set(row.id, newRow);
                grouped.push(newRow);
            }
            
            if (row.c_id) {
                map.get(row.id).carousel_items.push({
                    id: row.c_id,
                    no_mesin: row.c_no_mesin,
                    tipe_mesin: row.tipe_mesin,
                    no_disk: row.no_disk,
                    tanggal_wo: row.tanggal_wo,
                    no_wo: row.no_wo,
                    keterangan: row.c_keterangan,
                    status: row.status,
                    alasan_reject: row.alasan_reject,
                    hasil2_p: row.c_hasil_p,
                    hasil2_l: row.c_hasil_l,
                    hasil2_t: row.c_hasil_t,
                    hasil2_qty: row.c_hasil_qty,
                    waste_kulit_p: row.waste_kulit_p,
                    waste_kulit_l: row.waste_kulit_l,
                    waste_kulit_t: row.waste_kulit_t,
                    waste_kulit_qty: row.waste_kulit_qty,
                    sispot_p: row.sispot_p,
                    sispot_l: row.sispot_l,
                    sispot_t: row.sispot_t,
                    sispot_qty: row.sispot_qty,
                    sispot_keterangan: row.sispot_keterangan,
                    waste_potong_p: row.waste_potong_p,
                    waste_potong_l: row.waste_potong_l,
                    waste_potong_t: row.waste_potong_t,
                    waste_potong_qty: row.waste_potong_qty,
                    waste_produksi_p: row.waste_produksi_p,
                    waste_produksi_l: row.waste_produksi_l,
                    waste_produksi_t: row.waste_produksi_t,
                    waste_produksi_qty: row.waste_produksi_qty,
                    waste_produksi_keterangan: row.waste_produksi_keterangan
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

        // Validasi keberadaan record target (IDOR Check)
        const [existingRows] = await connection.query('SELECT * FROM realisasi_identitas WHERE id = ?', [id]);
        if (!existingRows || existingRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Data realisasi tidak ditemukan' });
        }
        const existingRecord = existingRows[0];

        const {
            // Identitas
            kualitas, no_barcode, tanggal, no_spk, nama_operator, shift, grup,
            asal_p, asal_l, asal_t, asal_qty, keterangan_kondisi,
            
            // Level 1 - Vertical
            no_mesin, hasil_p, hasil_l, hasil_t, hasil_qty,
            waste_samping_p, waste_samping_l, waste_samping_t, waste_samping_qty,
            waste_dpn_blk_p, waste_dpn_blk_l, waste_dpn_blk_t, waste_dpn_blk_qty,
            waste_produksi_p, waste_produksi_l, waste_produksi_t, waste_produksi_qty,
            sisa_p, sisa_l, sisa_t, sisa_qty, sisa_keterangan,
            dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan, sisa_potong_id_used,
            
            // Level 2 - Carousel/Horizontal (Array of objects)
            carousel_items,
            status = 'SUBMITTED'
        } = req.body;

        // Validasi Kubikasi - BYPASS JIKA DRAFT
        if (status !== 'DRAFT' && carousel_items && carousel_items.length > 0) {
            let totalDemandT_Utama = 0;
            let totalDemandT_Sispot = 0;
            
            for (const item of carousel_items) {
                const itemTotalT = (Number(item.hasil2_t || item.hasil_t || 0) * Number(item.hasil2_qty || item.hasil_qty || 0)) + 
                                   (Number(item.waste_kulit_t || 0) * Number(item.waste_kulit_qty || 1)) + 
                                   (Number(item.waste_potong_t || 0) * Number(item.waste_potong_qty || 1)) + 
                                   (Number(item.waste_produksi_t || 0) * Number(item.waste_produksi_qty || 1)) + 
                                   (Number(item.sispot_t || 0) * Number(item.sispot_qty || 1));
                
                if (item.source_block === 'Sispot') {
                    totalDemandT_Sispot += itemTotalT;
                    const sispotTinggi = Number(sisa_t || 0);
                    if (Number(item.hasil2_l || item.hasil_l || 0) > sispotTinggi + 0.001) {
                        await connection.rollback();
                        return res.status(400).json({ 
                            message: `Validasi Gagal: Lebar demand WO Sispot melebihi Tinggi Sispot (${sispotTinggi} cm).` 
                        });
                    }
                } else {
                    totalDemandT_Utama += itemTotalT;
                }
            }

            const sbHeightUtama = Number(hasil_t || 0) * Number(hasil_qty || 1);
            const sbHeightSispot = Number(sisa_l || 0) * Number(sisa_qty || 1);

            if (totalDemandT_Utama > sbHeightUtama + 0.01) {
                await connection.rollback();
                return res.status(400).json({ 
                    message: `Kubikasi Gagal: Ketinggian demand Utama (${totalDemandT_Utama.toFixed(2)} cm) melebihi tinggi SB Vertical (${sbHeightUtama.toFixed(2)} cm)` 
                });
            } else if (sbHeightUtama > 0 && totalDemandT_Utama < sbHeightUtama - 0.01 && totalDemandT_Sispot > 0) {
                await connection.rollback();
                return res.status(400).json({ 
                    message: `Validasi Gagal: Masih ada sisa ketinggian Utama (${(sbHeightUtama - totalDemandT_Utama).toFixed(2)} cm). Harap habiskan Hasil Utama sebelum memotong Sispot.` 
                });
            }

            if (totalDemandT_Sispot > sbHeightSispot + 0.01) {
                await connection.rollback();
                return res.status(400).json({ 
                    message: `Kubikasi Gagal: Ketinggian demand Sispot (${totalDemandT_Sispot.toFixed(2)} cm) melebihi ketersediaan Sispot (${sbHeightSispot.toFixed(2)} cm)` 
                });
            }

        }

        // 1. Update Identitas
        await connection.query(
            `UPDATE realisasi_identitas SET 
            kualitas=?, no_barcode=?, tanggal=?, no_spk=?, nama_operator=?, shift=?, grup=?, 
            asal_p=?, asal_l=?, asal_t=?, asal_qty=?, keterangan_kondisi=?, status=? WHERE id=?`,
            [
                kualitas || '', no_barcode || '', tanggal || null, no_spk || '', nama_operator || '', shift || '', grup || '',
                asal_p || 0, asal_l || 0, asal_t || 0, asal_qty || 0, keterangan_kondisi || '', status,
                id
            ]
        );

        // 2. Update Vertical
        await connection.query(
            `UPDATE realisasi_vertical SET 
            no_mesin=?, hasil_p=?, hasil_l=?, hasil_t=?, hasil_qty=?, 
            waste_samping_p=?, waste_samping_l=?, waste_samping_t=?, waste_samping_qty=?,
            waste_dpn_blk_p=?, waste_dpn_blk_l=?, waste_dpn_blk_t=?, waste_dpn_blk_qty=?,
            waste_produksi_p=?, waste_produksi_l=?, waste_produksi_t=?, waste_produksi_qty=?,
            sisa_p=?, sisa_l=?, sisa_t=?, sisa_qty=?, sisa_keterangan=?,
            dt_kode=?, dt_jam_awal=?, dt_jam_akhir=?, dt_keterangan=?, sisa_potong_id_used=? WHERE identitas_id=?`,
            [
                no_mesin || '',
                hasil_p || 0, hasil_l || 0, hasil_t || 0, hasil_qty || 0,
                waste_samping_p || 0, waste_samping_l || 0, waste_samping_t || 0, waste_samping_qty || 0,
                waste_dpn_blk_p || 0, waste_dpn_blk_l || 0, waste_dpn_blk_t || 0, waste_dpn_blk_qty || 0,
                waste_produksi_p || 0, waste_produksi_l || 0, waste_produksi_t || 0, waste_produksi_qty || 0,
                sisa_p || 0, sisa_l || 0, sisa_t || 0, sisa_qty || 0, sisa_keterangan || '',
                dt_kode || '', dt_jam_awal || null, dt_jam_akhir || null, dt_keterangan || '', sisa_potong_id_used || null,
                id
            ]
        );

        // 3. Update Carousel (Hapus lama, Insert baru)
        await connection.query(`DELETE FROM realisasi_carousel WHERE identitas_id=?`, [id]);
        
        if (carousel_items && carousel_items.length > 0) {
            for (const item of carousel_items) {
                await connection.query(
                      `INSERT INTO realisasi_carousel 
                      (identitas_id, no_mesin, tipe_mesin, no_disk, tanggal_wo, no_wo, keterangan, source_block, hasil_p, hasil_l, hasil_t, hasil_qty, status, alasan_reject,
                      waste_kulit_p, waste_kulit_l, waste_kulit_t, waste_kulit_qty, sispot_p, sispot_l, sispot_t, sispot_qty, sispot_keterangan,
                      waste_potong_p, waste_potong_l, waste_potong_t, waste_potong_qty, waste_produksi_p, waste_produksi_l, waste_produksi_t, waste_produksi_qty, waste_produksi_keterangan,
                      dt_kode, dt_jam_awal, dt_jam_akhir, dt_keterangan) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                          id,
                          item.no_mesin || '',
                          item.tipe_mesin || 'Horizontal', item.no_disk || '', item.tanggal_wo || null, item.no_wo || '', item.keterangan || '',
                          item.source_block || 'Utama',
                          item.hasil2_p || item.hasil_p || 0, item.hasil2_l || item.hasil_l || 0, item.hasil2_t || item.hasil_t || 0, item.hasil2_qty || item.hasil_qty || 0,
                          item.status || 'OK', item.alasan_reject || '',
                          item.waste_kulit_p || 0, item.waste_kulit_l || 0, item.waste_kulit_t || 0, item.waste_kulit_qty || 0,
                          item.sispot_p || 0, item.sispot_l || 0, item.sispot_t || 0, item.sispot_qty || 0, item.sispot_keterangan || '',
                          item.waste_potong_p || 0, item.waste_potong_l || 0, item.waste_potong_t || 0, item.waste_potong_qty || 0,
                          item.waste_produksi_p || 0, item.waste_produksi_l || 0, item.waste_produksi_t || 0, item.waste_produksi_qty || 0, item.waste_produksi_keterangan || '',
                          item.dt_kode || '', item.dt_jam_awal || null, item.dt_jam_akhir || null, item.dt_keterangan || ''
                      ]
                  );
            }
        }
        // 4. Update Sisa Potong ke stok_sisa_potong
        await connection.query('DELETE FROM stok_sisa_potong WHERE identitas_id = ?', [id]);
        
        if (status === 'SUBMITTED' && no_barcode) {
            if (Number(sisa_t) > 0 && Number(sisa_qty) > 0) {
                await connection.query(`
                    INSERT INTO stok_sisa_potong (identitas_id, no_barcode, kualitas, sumber_potong, p, l, t, qty)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [id, no_barcode, kualitas, 'Vertical', sisa_p || 0, sisa_l || 0, sisa_t || 0, sisa_qty || 0]);
            }
            if (carousel_items && carousel_items.length > 0) {
                for (const item of carousel_items) {
                    if (Number(item.sispot_t) > 0 && Number(item.sispot_qty) > 0) {
                        await connection.query(`
                            INSERT INTO stok_sisa_potong (identitas_id, no_barcode, kualitas, sumber_potong, p, l, t, qty)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [id, no_barcode, kualitas, 'Horizontal', item.sispot_p || 0, item.sispot_l || 0, item.sispot_t || 0, item.sispot_qty || 0]);
                    }
                }
            }
        }
        // Mark Sisa Potong as used if provided and submitted
        if (status === 'SUBMITTED' && sisa_potong_id_used) {
            await connection.query('UPDATE stok_sisa_potong SET is_used = TRUE WHERE id = ?', [sisa_potong_id_used]);
        }

        await connection.commit();

        // Catat Audit Trail
        await logAudit(req, {
            action: 'UPDATE_REALISASI',
            targetEntity: 'realisasi_identitas',
            targetId: id,
            details: {
                old_barcode: existingRecord.no_barcode,
                new_barcode: no_barcode,
                kualitas,
                operator: nama_operator,
                tanggal,
                shift,
                status
            }
        });

        res.json({ message: 'Data realisasi berhasil diupdate!' });
    } catch (error) {
        await connection.rollback();
        console.error('[ERROR] updateRealisasi:', error);
        res.status(500).json({ success: false, message: 'Gagal mengupdate data realisasi.' });
    } finally {
        connection.release();
    }
};

exports.deleteRealisasi = async (req, res) => {
    const { id } = req.params;
    try {
        // Validasi keberadaan record target (IDOR Check)
        const [existing] = await db.query('SELECT * FROM realisasi_identitas WHERE id = ?', [id]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Data realisasi tidak ditemukan' });
        }
        const record = existing[0];

        // Karena ada ON DELETE CASCADE, tabel terkait (vertical & carousel) otomatis terhapus
        await db.query(`DELETE FROM stok_sisa_potong WHERE identitas_id = ?`, [id]);
        const [result] = await db.query(`DELETE FROM realisasi_identitas WHERE id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }

        // Catat Audit Trail
        await logAudit(req, {
            action: 'DELETE_REALISASI',
            targetEntity: 'realisasi_identitas',
            targetId: id,
            details: {
                no_barcode: record.no_barcode,
                kualitas: record.kualitas,
                operator: record.nama_operator,
                tanggal: record.tanggal,
                shift: record.shift
            }
        });

        res.json({ success: true, message: 'Data realisasi berhasil dihapus!' });
    } catch (error) {
        console.error('[ERROR] deleteRealisasi:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus data realisasi.' });
    }
};

// ====================================================================================
// ==================== VERTICAL PRODUCTION DATA ANALYZER =============================
// ====================================================================================

exports.getHasilRealisasiVertikal = async (req, res) => {
    try {
        // 1. Fetch realisasi identitas joined with vertical
        const query = `
            SELECT 
                i.id AS identitas_id, i.kualitas, i.no_barcode, i.tanggal, i.no_spk, i.nama_operator, i.shift, i.grup,
                i.asal_p, i.asal_l, i.asal_t, i.asal_qty,
                v.id AS vertical_id, v.no_mesin, 
                v.hasil_p, v.hasil_l, v.hasil_t, v.hasil_qty,
                v.waste_samping_p, v.waste_samping_l, v.waste_samping_t, v.waste_samping_qty,
                v.waste_dpn_blk_p, v.waste_dpn_blk_l, v.waste_dpn_blk_t, v.waste_dpn_blk_qty,
                v.waste_produksi_p, v.waste_produksi_l, v.waste_produksi_t, v.waste_produksi_qty,
                v.sisa_p, v.sisa_l, v.sisa_t, v.sisa_qty, v.sisa_keterangan
            FROM realisasi_identitas i
            JOIN realisasi_vertical v ON i.id = v.identitas_id
            WHERE i.status != 'DRAFT'
            ORDER BY i.created_at DESC
        `;
        const [rows] = await db.query(query);

        // 2. Fetch CT Matrix for Vertical
        const [matrixVertikal] = await db.query("SELECT nama_item, cycle_time_menit, varians FROM cycle_time_matrix WHERE tipe_mesin = 'Vertikal'");
        const sortedVertikal = matrixVertikal.sort((a, b) => b.nama_item.length - a.nama_item.length);

        // 3. Fetch Carousel items that used Sispot
        const [sispotUsedRows] = await db.query(`
            SELECT identitas_id, 
                   SUM((hasil_p * hasil_l * hasil_t * hasil_qty) + 
                       (waste_kulit_p * waste_kulit_l * waste_kulit_t * waste_kulit_qty) + 
                       (sispot_p * sispot_l * sispot_t * sispot_qty) + 
                       (waste_potong_p * waste_potong_l * waste_potong_t * waste_potong_qty) + 
                       (waste_produksi_p * waste_produksi_l * waste_produksi_t * waste_produksi_qty)) / 1000000 AS total_sispot_used_m3
            FROM realisasi_carousel 
            WHERE source_block = 'Sispot'
            GROUP BY identitas_id
        `);
        const sispotUsedMap = {};
        sispotUsedRows.forEach(row => {
            sispotUsedMap[row.identitas_id] = Number(row.total_sispot_used_m3 || 0);
        });


        // 3. Group and Process Logic
        const groupData = {};
        const calcVol = (p, l, t, qty) => (Number(p||0) * Number(l||0) * Number(t||0) * Number(qty||0)) / 1000000;

        rows.forEach(row => {
            if (!groupData[row.identitas_id]) {
                groupData[row.identitas_id] = {
                    m3_asal: calcVol(row.asal_p, row.asal_l, row.asal_t, row.asal_qty),
                    m3_waste_samping: calcVol(row.asal_p, row.asal_t, row.waste_samping_t, row.waste_samping_qty),
                    m3_waste_depan: calcVol(row.asal_l, row.asal_t, row.waste_dpn_blk_t, row.waste_dpn_blk_qty),
                    m3_waste_produksi: calcVol(row.waste_produksi_p, row.waste_produksi_l, row.waste_produksi_t, row.waste_produksi_qty),
                    total_m3_demand: 0
                };
            }
            // M3 WO (Using vertical inputs temporarily as requested)
            const m3_wo = calcVol(row.hasil_p, row.hasil_l, row.hasil_t, row.hasil_qty);
            groupData[row.identitas_id].total_m3_demand += m3_wo;
        });

        const results = rows.map(row => {
            const g = groupData[row.identitas_id];
            const m3_wo = calcVol(row.hasil_p, row.hasil_l, row.hasil_t, row.hasil_qty);
            
            let m3_sisa_potong = g.m3_asal - g.total_m3_demand - g.m3_waste_samping - g.m3_waste_depan - g.m3_waste_produksi;
            
            // Deduct from Sispot Used by Carousel
            const sispotUsed = sispotUsedMap[row.identitas_id] || 0;
            m3_sisa_potong -= sispotUsed;
            
            if (m3_sisa_potong < 0) m3_sisa_potong = 0;

            const cleanKualitas = (row.kualitas || '').replace(/\s+/g, '').toLowerCase();
            const matchedVertikal = sortedVertikal.find(m => cleanKualitas.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()));
            const baseCT = matchedVertikal ? (parseFloat(matchedVertikal.cycle_time_menit) || 0) : 0;
            const varians_potong = matchedVertikal ? (matchedVertikal.varians || '-') : '-';
            
            const qtyAktual = Number(row.hasil_qty || 0);
            const summary_ct_aktual = Number((baseCT * qtyAktual).toFixed(2));

            let status_validasi = "PASS";
            if (g.total_m3_demand > g.m3_asal + 0.00001) {
                status_validasi = `WARNING - Volume Over-Demand: Kebutuhan WO melebihi dimensi fisik balokan aktual`;
            }

            return {
                summary_realisasi_vertical: {
                    barcode_sb: row.no_barcode,
                    kualitas_busa: row.kualitas,
                    varians_potong: varians_potong,
                    base_ct: baseCT,
                    summary_ct_aktual: summary_ct_aktual
                },
                rincian_kubikasi: {
                    m3_hasil: Number(m3_wo.toFixed(5)),
                    m3_waste_samping: Number(g.m3_waste_samping.toFixed(5)),
                    m3_waste_depan: Number(g.m3_waste_depan.toFixed(5)),
                    m3_waste_produksi: Number(g.m3_waste_produksi.toFixed(5)),
                    m3_sisa_potong: Number(m3_sisa_potong.toFixed(5))
                },
                parameter_tambahan: { downtime: 0, defect: 0 },
                status_validasi: status_validasi,
                _raw: {
                    id: row.identitas_id,
                    tanggal: row.tanggal,
                    shift: row.shift,
                    no_spk: row.no_spk,
                    carousel_wo: '-',
                    carousel_mesin: '-',
                    operator: row.nama_operator,
                    mesin: row.no_mesin,
                    keterangan_kondisi: row.keterangan_kondisi,
                    status: row.identitas_status,
                    created_at: row.created_at,
                    asal_m3: Number(g.m3_asal.toFixed(5)),
                    asal_p: row.asal_p,
                    asal_l: row.asal_l,
                    asal_t: row.asal_t,
                    asal_qty: row.asal_qty,
                    hasil_p: row.hasil_p,
                    hasil_l: row.hasil_l,
                    hasil_t: row.hasil_t,
                    hasil_qty: row.hasil_qty,
                    m3_wo: Number(m3_wo.toFixed(5)),
                    total_m3_demand: Number(g.total_m3_demand.toFixed(5)),
                    m3_sisa_potong: Number(m3_sisa_potong.toFixed(5)),
                    status_validasi: status_validasi
                }
            };
        });

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('[ERROR] getHasilRealisasiVertikal:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data hasil realisasi vertikal.' });
    }
};

// ====================================================================================
// ==================== HORIZONTAL PRODUCTION DATA ANALYZER ===========================
// ====================================================================================

exports.getHasilRealisasiHorizontal = async (req, res) => {
    try {
        const query = `
            SELECT 
                i.id AS identitas_id, i.kualitas, i.no_barcode, i.tanggal, i.no_spk, i.nama_operator, i.shift, i.grup,
                i.asal_p, i.asal_l, i.asal_t, i.asal_qty,
                v.no_mesin AS vertikal_mesin, v.hasil_p AS vertikal_p, v.hasil_l AS vertikal_l, v.hasil_t AS vertikal_t, v.hasil_qty AS vertikal_qty,
                c.id AS carousel_id, c.tipe_mesin, c.no_mesin, c.no_disk, c.no_wo, c.keterangan,
                c.hasil_p, c.hasil_l, c.hasil_t, c.hasil_qty, c.status, c.alasan_reject,
                c.waste_kulit_p, c.waste_kulit_l, c.waste_kulit_t, c.waste_kulit_qty,
                c.sispot_p, c.sispot_l, c.sispot_t, c.sispot_qty, c.sispot_keterangan,
                c.waste_potong_p, c.waste_potong_l, c.waste_potong_t, c.waste_potong_qty,
                c.waste_produksi_p, c.waste_produksi_l, c.waste_produksi_t, c.waste_produksi_qty,
                COALESCE(so.order_qty, so_fallback.order_qty, 0) AS order_qty
            FROM realisasi_identitas i
            JOIN realisasi_carousel c ON i.id = c.identitas_id
            LEFT JOIN realisasi_vertical v ON i.id = v.identitas_id
            LEFT JOIN (
                SELECT s.no_wo, DATE_FORMAT(u.tanggal_upload, '%Y-%m-%d') AS tgl_spk, SUM(s.qty_cutting) AS order_qty
                FROM spk_items s
                JOIN upload_history u ON s.history_id = u.id
                GROUP BY s.no_wo, DATE_FORMAT(u.tanggal_upload, '%Y-%m-%d')
            ) AS so ON c.no_wo = so.no_wo AND (DATE_FORMAT(c.tanggal_wo, '%Y-%m-%d') = so.tgl_spk OR DATE_FORMAT(i.tanggal, '%Y-%m-%d') = so.tgl_spk)
            LEFT JOIN (
                SELECT no_wo, SUM(qty_cutting) AS order_qty FROM spk_items GROUP BY no_wo
            ) AS so_fallback ON c.no_wo = so_fallback.no_wo
            WHERE i.status != 'DRAFT'
            ORDER BY i.created_at DESC
        `;
        const [rows] = await db.query(query);

        const [matrixAll] = await db.query("SELECT * FROM cycle_time_matrix WHERE tipe_mesin IN ('Horizontal', 'Carousel')");
        const sortedMatrix = matrixAll.sort((a, b) => b.nama_item.length - a.nama_item.length);

        const groupData = {};
        const calcVol = (p, l, t, qty) => (Number(p||0) * Number(l||0) * Number(t||0) * Number(qty||0)) / 1000000;

        rows.forEach(row => {
            const tipeMesin = row.tipe_mesin || 'Horizontal'; // Fallback
            const groupKey = `${row.identitas_id}_${tipeMesin}`;

            if (!groupData[groupKey]) {
                const cleanKualitas = (row.kualitas || '').replace(/\s+/g, '').toLowerCase();
                const matched = sortedMatrix.find(m => m.tipe_mesin === tipeMesin && cleanKualitas.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()));
                
                const ct_c1 = matched ? (parseFloat(matched.ct_c1) || 0) : 0;
                const ct_c2 = matched ? (parseFloat(matched.ct_c2) || 0) : 0;
                const ct_c3 = matched ? (parseFloat(matched.ct_c3) || 0) : 0;
                const ct_ptu = matched ? (parseFloat(matched.ct_ptu) || 0) : 0;
                const ct_pma = matched ? (parseFloat(matched.ct_pma) || 0) : 0;
                const ct_pmu = matched ? (parseFloat(matched.ct_pmu) || 0) : 0;
                const varians_potong = matched ? (matched.varians || '-') : '-';

                groupData[groupKey] = {
                    identitas: row,
                    tipe_mesin: tipeMesin,
                    m3_asal: calcVol(row.vertikal_p, row.vertikal_l, row.vertikal_t, row.vertikal_qty),
                    total_m3_hasil: 0,
                    total_m3_waste_kulit: 0,
                    total_m3_sispot: 0,
                    total_m3_waste_potong: 0,
                    total_m3_waste_produksi: 0,
                    total_tinggi_demand: 0,
                    total_qty_hasil: 0,
                    varians_potong: varians_potong,
                    ct_c1: ct_c1,
                    ct_c2: ct_c2,
                    ct_c3: ct_c3,
                    ct_ptu: ct_ptu,
                    ct_pma: ct_pma,
                    ct_pmu: ct_pmu,
                    total_sum_ptu: 0,
                    total_sum_pma: 0,
                    total_sum_pmu: 0,
                    demand_list: []
                };
            }

            const g = groupData[groupKey];
            
            // Kubikasi per WO
            const m3_wo = calcVol(row.hasil_p, row.hasil_l, row.hasil_t, row.hasil_qty);
            const m3_wk = calcVol(row.waste_kulit_p, row.waste_kulit_l, row.waste_kulit_t, row.waste_kulit_qty);
            const m3_sp = calcVol(row.sispot_p, row.sispot_l, row.sispot_t, row.sispot_qty);
            const m3_wp = calcVol(row.waste_potong_p, row.waste_potong_l, row.waste_potong_t, row.waste_potong_qty);
            const m3_wpr = calcVol(row.waste_produksi_p, row.waste_produksi_l, row.waste_produksi_t, row.waste_produksi_qty);

            g.total_m3_hasil += m3_wo;
            g.total_m3_waste_kulit += m3_wk;
            g.total_m3_sispot += m3_sp;
            g.total_m3_waste_potong += m3_wp;
            g.total_m3_waste_produksi += m3_wpr;

            // Tinggi per WO untuk validasi
            const tinggi_wo = (Number(row.hasil_t || 0) * Number(row.hasil_qty || 0)) + 
                              (Number(row.waste_kulit_t || 0) * Number(row.waste_kulit_qty || 1)) + 
                              (Number(row.waste_potong_t || 0) * Number(row.waste_potong_qty || 1)) + 
                              (Number(row.waste_produksi_t || 0) * Number(row.waste_produksi_qty || 1)) + 
                              (Number(row.sispot_t || 0) * Number(row.sispot_qty || 1));
            g.total_tinggi_demand += tinggi_wo;

            // Qty Hasil per WO
            const qtyHasil = Number(row.hasil_qty || 0);
            const qtyWk = Number(row.waste_kulit_qty || 0);
            const qtyWp = Number(row.waste_potong_qty || 0);
            const qtyWpr = Number(row.waste_produksi_qty || 0);
            const qtySp = Number(row.sispot_qty || 0);

            g.total_qty_hasil += qtyHasil;
            g.total_qty_all_cuts = (g.total_qty_all_cuts || 0) + (qtyHasil + qtyWk + qtyWp + qtyWpr + qtySp);

            // Perhitungan CT PTU, PMA, PMU per kategori dalam 1 WO
            const calcItemCT = (t, qty) => {
                let ptu = 0, pma = 0, pmu = 0;
                if (g.tipe_mesin === 'Carousel') {
                    const qtyAsal = Number(row.vertikal_qty || 1);
                    const roundupFactor = Math.ceil((qtyAsal / 6) * 100) / 100;
                    ptu = g.ct_ptu * t * (qty / qtyAsal) * roundupFactor;
                    pma = g.ct_pma * (qty / qtyAsal) * roundupFactor;
                    pmu = 0; // Tidak ada PMU untuk carousel
                } else {
                    ptu = g.ct_ptu * t * qty;
                    pma = g.ct_pma * qty;
                    pmu = g.ct_pmu * qty;
                }
                return { ptu, pma, pmu };
            };

            const ctHasil = calcItemCT(Number(row.hasil_t || 0), qtyHasil);
            const ctWk = calcItemCT(Number(row.waste_kulit_t || 0), qtyWk);
            const ctWp = calcItemCT(Number(row.waste_potong_t || 0), qtyWp);
            const ctWpr = calcItemCT(Number(row.waste_produksi_t || 0), qtyWpr);
            const ctSp = calcItemCT(Number(row.sispot_t || 0), qtySp);

            g.total_sum_ptu += ctHasil.ptu + ctWk.ptu + ctWp.ptu + ctWpr.ptu + ctSp.ptu;
            g.total_sum_pma += ctHasil.pma + ctWk.pma + ctWp.pma + ctWpr.pma + ctSp.pma;
            g.total_sum_pmu += ctHasil.pmu + ctWk.pmu + ctWp.pmu + ctWpr.pmu + ctSp.pmu;

            g.demand_list.push({
                no_wo: row.no_wo,
                no_disk: row.no_disk,
                order_qty: row.order_qty || 0,
                hasil_p: row.hasil_p,
                hasil_l: row.hasil_l,
                hasil_t: row.hasil_t,
                hasil_qty: row.hasil_qty,
                m3_wo: Number(m3_wo.toFixed(5)),
                m3_wk: Number(m3_wk.toFixed(5)),
                m3_sp: Number(m3_sp.toFixed(5)),
                m3_wp: Number(m3_wp.toFixed(5)),
                m3_wpr: Number(m3_wpr.toFixed(5)),
                no_mesin: row.no_mesin,
                keterangan: row.keterangan
            });
        });

        // Format to array
        const results = Object.keys(groupData).map(id => {
            const g = groupData[id];
            const row = g.identitas;

            let m3_sisa_potong = g.m3_asal - g.total_m3_demand; // as requested: murni asal - wo
            if (m3_sisa_potong < 0) m3_sisa_potong = 0;

            // Kalkulasi Summary CT
            const qtyBahanBakuAsal = Number(row.vertikal_qty || 1);
            const sum_c1 = g.tipe_mesin === 'Carousel' ? Number(g.ct_c1) : g.ct_c1 * qtyBahanBakuAsal;
            const sum_c2 = g.ct_c2 * qtyBahanBakuAsal;
            const sum_c3 = g.ct_c3 * qtyBahanBakuAsal;
            
            const sum_ptu = g.total_sum_ptu;
            const sum_pma = g.total_sum_pma;
            const sum_pmu = g.total_sum_pmu;

            const total_sum_ct = sum_c1 + sum_c2 + sum_ptu + sum_pma + sum_pmu + sum_c3;

            let status_validasi = "PASS";
            const tinggiAsal = Number(row.vertikal_t || 0) * qtyBahanBakuAsal;
            if (g.total_tinggi_demand > tinggiAsal + 0.00001) {
                status_validasi = `WARNING - Over-Height: Total tinggi demand (${g.total_tinggi_demand.toFixed(2)}) melebihi tinggi Induk (${tinggiAsal.toFixed(2)})`;
            }

            // Kubikasi details (M3, KG, Pct)
            const beratJenisMatch = (row.kualitas || '').match(/\d+/);
            const beratJenis = beratJenisMatch ? parseInt(beratJenisMatch[0], 10) : 0;

            const calcDetail = (m3_val) => {
                const pct = g.m3_asal > 0 ? (m3_val / g.m3_asal) * 100 : 0;
                return {
                    m3: Number(m3_val.toFixed(5)),
                    kg: Number((m3_val * beratJenis).toFixed(2)),
                    pct: Number(pct.toFixed(2))
                };
            };

            return {
                summary_realisasi_horizontal: {
                    tipe_mesin: g.tipe_mesin,
                    barcode_sb: row.no_barcode,
                    kualitas_busa: row.kualitas,
                    varians_potong: g.varians_potong,
                    total_qty_hasil: g.total_qty_hasil,
                    base_ct: {
                        c1: Number(g.ct_c1.toFixed(2)),
                        c2: Number(g.ct_c2.toFixed(2)),
                        ptu: Number(g.ct_ptu.toFixed(2)),
                        pma: Number(g.ct_pma.toFixed(2)),
                        pmu: Number(g.ct_pmu.toFixed(2)),
                        c3: Number(g.ct_c3.toFixed(2))
                    },
                    summary_ct: {
                        c1: Number(sum_c1.toFixed(4)),
                        c2: Number(sum_c2.toFixed(4)),
                        ptu: Number(sum_ptu.toFixed(4)),
                        pma: Number(sum_pma.toFixed(4)),
                        pmu: Number(sum_pmu.toFixed(4)),
                        c3: Number(sum_c3.toFixed(4))
                    },
                    total_sum_ct: Number(total_sum_ct.toFixed(2))
                },
                rincian_kubikasi: {
                    m3_asal: Number(g.m3_asal.toFixed(5)),
                    hasil: calcDetail(g.total_m3_hasil),
                    waste_kulit: calcDetail(g.total_m3_waste_kulit),
                    sispot: calcDetail(g.total_m3_sispot),
                    waste_potong: calcDetail(g.total_m3_waste_potong),
                    waste_produksi: calcDetail(g.total_m3_waste_produksi)
                },
                demand_list: g.demand_list,
                status_validasi: status_validasi,
                _raw: {
                    id: row.identitas_id,
                    tanggal: row.tanggal,
                    shift: row.shift,
                    no_spk: row.no_spk,
                    operator: row.nama_operator,
                    mesin: g.demand_list.length > 0 ? g.demand_list[0].no_mesin : '-',
                    asal_p: row.asal_p,
                    asal_l: row.asal_l,
                    asal_t: row.asal_t,
                    asal_qty: row.asal_qty,
                    vertikal_p: row.vertikal_p,
                    vertikal_l: row.vertikal_l,
                    vertikal_t: row.vertikal_t,
                    vertikal_qty: row.vertikal_qty,
                    vertikal_mesin: row.vertikal_mesin,
                    total_tinggi_demand: Number(g.total_tinggi_demand.toFixed(2))
                }
            };
        });

        res.json({ success: true, data: results.sort((a, b) => b._raw.id - a._raw.id) });
    } catch (error) {
        console.error('[ERROR] getHasilRealisasiHorizontal:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data hasil realisasi horizontal.' });
    }
};

exports.getSisaPotongByBarcode = async (req, res) => {
    const { barcode } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM stok_sisa_potong WHERE no_barcode = ? AND is_used = FALSE ORDER BY created_at ASC', [barcode]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[ERROR] getSisaPotongByBarcode:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data sisa potong' });
    }
};

exports.getAllSisaPotong = async (req, res) => {
    try {
        const query = `
            SELECT 
                id, identitas_id, no_barcode, kualitas, sumber_potong,
                p, l, t, qty, is_used, created_at
            FROM stok_sisa_potong
            ORDER BY created_at DESC
        `;
        const [rows] = await db.query(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[ERROR] getAllSisaPotong:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data stok sisa potong' });
    }
};

// CREATE Sisa Potong Manual
exports.createSisaPotongManual = async (req, res) => {
    const role = (req.user?.role || '').trim();
    if (role.toLowerCase() !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya Superadmin yang berwenang menambah data sisa potong.' });
    }
    const { no_barcode, kualitas, sumber_potong, p, l, t, qty } = req.body;
    try {
        const query = `
            INSERT INTO stok_sisa_potong 
            (identitas_id, no_barcode, kualitas, sumber_potong, p, l, t, qty, is_used) 
            VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, FALSE)
        `;
        const [result] = await db.query(query, [
            no_barcode || null,
            kualitas,
            sumber_potong || 'Manual',
            p || 0,
            l || 0,
            t || 0,
            qty || 0
        ]);

        await logAudit(req, {
            action: 'CREATE_SISA_POTONG',
            targetEntity: 'stok_sisa_potong',
            targetId: result.insertId,
            details: { no_barcode, kualitas, sumber_potong, p, l, t, qty }
        });

        res.status(201).json({ success: true, message: 'Sisa potong manual berhasil ditambahkan', insertId: result.insertId });
    } catch (error) {
        console.error('[ERROR] createSisaPotongManual:', error);
        res.status(500).json({ success: false, message: 'Gagal menambahkan sisa potong' });
    }
};

// UPDATE Sisa Potong
exports.updateSisaPotong = async (req, res) => {
    const role = (req.user?.role || '').trim();
    if (role.toLowerCase() !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya Superadmin yang berwenang mengupdate data sisa potong.' });
    }
    const { id } = req.params;
    const { no_barcode, kualitas, sumber_potong, p, l, t, qty } = req.body;
    try {
        const [existing] = await db.query('SELECT * FROM stok_sisa_potong WHERE id = ?', [id]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Data sisa potong tidak ditemukan' });
        }

        const query = `
            UPDATE stok_sisa_potong 
            SET no_barcode=?, kualitas=?, sumber_potong=?, p=?, l=?, t=?, qty=?
            WHERE id=?
        `;
        const [result] = await db.query(query, [
            no_barcode || null, kualitas, sumber_potong, p || 0, l || 0, t || 0, qty || 0, id
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data sisa potong tidak ditemukan' });
        }

        await logAudit(req, {
            action: 'UPDATE_SISA_POTONG',
            targetEntity: 'stok_sisa_potong',
            targetId: id,
            details: {
                old_barcode: existing[0].no_barcode,
                new_barcode: no_barcode,
                kualitas,
                p, l, t, qty
            }
        });

        res.json({ success: true, message: 'Data sisa potong berhasil diupdate' });
    } catch (error) {
        console.error('[ERROR] updateSisaPotong:', error);
        res.status(500).json({ success: false, message: 'Gagal mengupdate sisa potong' });
    }
};

// DELETE Sisa Potong
exports.deleteSisaPotong = async (req, res) => {
    const role = (req.user?.role || '').trim();
    if (role.toLowerCase() !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya Superadmin yang berwenang menghapus data sisa potong.' });
    }
    const { id } = req.params;
    try {
        const [existing] = await db.query('SELECT * FROM stok_sisa_potong WHERE id = ?', [id]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Data sisa potong tidak ditemukan' });
        }

        const [result] = await db.query('DELETE FROM stok_sisa_potong WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data sisa potong tidak ditemukan' });
        }

        await logAudit(req, {
            action: 'DELETE_SISA_POTONG',
            targetEntity: 'stok_sisa_potong',
            targetId: id,
            details: {
                no_barcode: existing[0].no_barcode,
                kualitas: existing[0].kualitas,
                p: existing[0].p,
                l: existing[0].l,
                t: existing[0].t,
                qty: existing[0].qty
            }
        });

        res.json({ success: true, message: 'Data sisa potong berhasil dihapus' });
    } catch (error) {
        console.error('[ERROR] deleteSisaPotong:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus sisa potong' });
    }
};
