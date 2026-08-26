const db = require('../config/db');

// Get all manpower data
exports.getManpower = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM mesin_manpower ORDER BY id ASC');
        res.json(rows);
    } catch (error) {
        console.error('[ERROR] getManpower:', error);
        res.status(500).json({ message: 'Gagal mengambil data mesin & manpower' });
    }
};

// Update manpower data
exports.updateManpower = async (req, res) => {
    const { id } = req.params;
    const { total_mesin, manpower_per_mesin } = req.body;

    try {
        await db.query(
            'UPDATE mesin_manpower SET total_mesin = ?, manpower_per_mesin = ? WHERE id = ?',
            [total_mesin, manpower_per_mesin, id]
        );
        res.json({ message: 'Data mesin & manpower berhasil diperbarui!' });
    } catch (error) {
        console.error('[ERROR] updateManpower:', error);
        res.status(500).json({ message: 'Gagal memperbarui data mesin & manpower' });
    }
};
