const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

exports.getAllMatrix = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM cycle_time_matrix ORDER BY tipe_mesin, varians, nama_item');
        res.json(rows);
    } catch (error) {
        console.error('[ERROR] getAllMatrix:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data matriks.' });
    }
};

exports.addMatrixItem = async (req, res) => {
    try {
        const { nama_item, varians, tipe_mesin, cycle_time_menit, ct_c1, ct_c2, ct_ptu, ct_pma, ct_pmu, ct_c3, tinggi_balokan_standar } = req.body;
        
        await db.query(
            `INSERT INTO cycle_time_matrix 
            (nama_item, varians, tipe_mesin, cycle_time_menit, ct_c1, ct_c2, ct_ptu, ct_pma, ct_pmu, ct_c3, tinggi_balokan_standar) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nama_item, varians, tipe_mesin, cycle_time_menit, ct_c1 || null, ct_c2 || null, ct_ptu || null, ct_pma || null, ct_pmu || null, ct_c3 || null, tinggi_balokan_standar || null]
        );
        res.status(201).json({ success: true, message: 'Item berhasil ditambahkan' });
    } catch (error) {
        console.error('[ERROR] addMatrixItem:', error);
        res.status(500).json({ success: false, message: 'Gagal menambahkan item ke matriks.' });
    }
};

exports.updateMatrixVarians = async (req, res) => {
    try {
        const { tipe_mesin, old_varians, new_varians, old_base_item, new_base_item, cycle_time_menit, ct_c1, ct_c2, ct_ptu, ct_pma, ct_pmu, ct_c3 } = req.body;
        
        // 1. Update cycle time and varians name for ALL items in this varians
        let query1 = 'UPDATE cycle_time_matrix SET ';
        const params1 = [];
        
        if (new_varians) { query1 += 'varians = ?, '; params1.push(new_varians); }
        if (cycle_time_menit !== undefined) { query1 += 'cycle_time_menit = ?, '; params1.push(cycle_time_menit); }
        if (ct_c1 !== undefined) { query1 += 'ct_c1 = ?, '; params1.push(ct_c1); }
        if (ct_c2 !== undefined) { query1 += 'ct_c2 = ?, '; params1.push(ct_c2); }
        if (ct_ptu !== undefined) { query1 += 'ct_ptu = ?, '; params1.push(ct_ptu); }
        if (ct_pma !== undefined) { query1 += 'ct_pma = ?, '; params1.push(ct_pma); }
        if (ct_pmu !== undefined) { query1 += 'ct_pmu = ?, '; params1.push(ct_pmu); }
        if (ct_c3 !== undefined) { query1 += 'ct_c3 = ?, '; params1.push(ct_c3); }
        
        if (params1.length > 0) {
            query1 = query1.slice(0, -2); // remove trailing comma and space
            query1 += ' WHERE tipe_mesin = ? AND varians = ?';
            params1.push(tipe_mesin, old_varians);
            await db.query(query1, params1);
        }

        // 2. Update base item name if it changed
        if (old_base_item && new_base_item && old_base_item !== new_base_item) {
            const targetVarians = new_varians || old_varians;
            await db.query(
                'UPDATE cycle_time_matrix SET nama_item = ? WHERE tipe_mesin = ? AND varians = ? AND nama_item = ?',
                [new_base_item, tipe_mesin, targetVarians, old_base_item]
            );
        }

        res.json({ success: true, message: 'Varians berhasil diperbarui' });
    } catch (error) {
        console.error('[ERROR] updateMatrixVarians:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui varians matriks.' });
    }
};

exports.updateMatrixItem = async (req, res) => {
    try {
        const { tipe_mesin, varians, old_nama_item, new_nama_item } = req.body;
        await db.query(
            'UPDATE cycle_time_matrix SET nama_item = ? WHERE tipe_mesin = ? AND varians = ? AND nama_item = ?',
            [new_nama_item, tipe_mesin, varians, old_nama_item]
        );
        res.json({ success: true, message: 'Item berhasil diperbarui' });
    } catch (error) {
        console.error('[ERROR] updateMatrixItem:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui item matriks.' });
    }
};

exports.deleteMatrixVarians = async (req, res) => {
    try {
        const { tipe_mesin, varians } = req.body;
        const [existing] = await db.query('SELECT COUNT(*) as count FROM cycle_time_matrix WHERE tipe_mesin = ? AND varians = ?', [tipe_mesin, varians]);
        await db.query('DELETE FROM cycle_time_matrix WHERE tipe_mesin = ? AND varians = ?', [tipe_mesin, varians]);

        await logAudit(req, {
            action: 'DELETE_MATRIX_VARIANS',
            targetEntity: 'cycle_time_matrix',
            targetId: `${tipe_mesin}-${varians}`,
            details: { tipe_mesin, varians, deleted_count: existing[0]?.count || 0 }
        });

        res.json({ success: true, message: 'Varians berhasil dihapus' });
    } catch (error) {
        console.error('[ERROR] deleteMatrixVarians:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus varians matriks.' });
    }
};

exports.deleteMatrixItem = async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await db.query('SELECT * FROM cycle_time_matrix WHERE id = ?', [id]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Item matrix tidak ditemukan' });
        }

        await db.query('DELETE FROM cycle_time_matrix WHERE id = ?', [id]);

        await logAudit(req, {
            action: 'DELETE_MATRIX',
            targetEntity: 'cycle_time_matrix',
            targetId: id,
            details: {
                nama_item: existing[0].nama_item,
                varians: existing[0].varians,
                tipe_mesin: existing[0].tipe_mesin
            }
        });

        res.json({ success: true, message: 'Item berhasil dihapus' });
    } catch (error) {
        console.error('[ERROR] deleteMatrixItem:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus item matriks.' });
    }
};

exports.deleteMatrixItemByName = async (req, res) => {
    try {
        const { nama_item, varians, tipe_mesin } = req.body;
        await db.query('DELETE FROM cycle_time_matrix WHERE nama_item = ? AND varians = ? AND tipe_mesin = ?', [nama_item, varians, tipe_mesin]);

        await logAudit(req, {
            action: 'DELETE_MATRIX_BY_NAME',
            targetEntity: 'cycle_time_matrix',
            targetId: `${tipe_mesin}-${nama_item}`,
            details: { nama_item, varians, tipe_mesin }
        });

        res.json({ success: true, message: 'Item berhasil dihapus' });
    } catch (error) {
        console.error('[ERROR] deleteMatrixItemByName:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus item matriks.' });
    }
};


