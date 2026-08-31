const db = require('../config/db');

exports.getAllMatrix = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM cycle_time_matrix ORDER BY tipe_mesin, varians, nama_item');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data matriks', error: error.message });
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
        res.status(201).json({ message: 'Item berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menambahkan item', error: error.message });
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

        res.json({ message: 'Varians berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal memperbarui varians', error: error.message });
    }
};

exports.updateMatrixItem = async (req, res) => {
    try {
        const { tipe_mesin, varians, old_nama_item, new_nama_item } = req.body;
        await db.query(
            'UPDATE cycle_time_matrix SET nama_item = ? WHERE tipe_mesin = ? AND varians = ? AND nama_item = ?',
            [new_nama_item, tipe_mesin, varians, old_nama_item]
        );
        res.json({ message: 'Item berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal memperbarui item', error: error.message });
    }
};

exports.deleteMatrixVarians = async (req, res) => {
    try {
        const { tipe_mesin, varians } = req.body;
        await db.query('DELETE FROM cycle_time_matrix WHERE tipe_mesin = ? AND varians = ?', [tipe_mesin, varians]);
        res.json({ message: 'Varians berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus varians', error: error.message });
    }
};

exports.deleteMatrixItem = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM cycle_time_matrix WHERE id = ?', [id]);
        res.json({ message: 'Item berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus item', error: error.message });
    }
};

exports.deleteMatrixItemByName = async (req, res) => {
    try {
        const { nama_item, varians, tipe_mesin } = req.body;
        await db.query('DELETE FROM cycle_time_matrix WHERE nama_item = ? AND varians = ? AND tipe_mesin = ?', [nama_item, varians, tipe_mesin]);
        res.json({ message: 'Item berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus item', error: error.message });
    }
};
