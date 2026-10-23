const express = require('express');
const router = express.Router();
const realisasiController = require('../controllers/realisasiController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Semua route realisasi memerlukan autentikasi token
router.use(verifyToken);

// Simpan data realisasi baru (POST /api/realisasi)
router.post('/', requireRole('Operator', 'Supervisor', 'PPC', 'Superadmin'), realisasiController.createRealisasi);

// Ambil semua data realisasi (GET /api/realisasi)
router.get('/', realisasiController.getAllRealisasi);

// Ambil semua stok sisa potong (GET /api/realisasi/sisa-potong/all)
router.get('/sisa-potong/all', realisasiController.getAllSisaPotong);

// CRUD Stok Sisa Potong Manual - Hanya Superadmin
router.post('/sisa-potong', requireRole('Superadmin'), realisasiController.createSisaPotongManual);
router.put('/sisa-potong/:id', requireRole('Superadmin'), realisasiController.updateSisaPotong);
router.delete('/sisa-potong/:id', requireRole('Superadmin'), realisasiController.deleteSisaPotong);

// Ambil sisa potong berdasarkan barcode (GET /api/realisasi/sisa-potong/:barcode)
router.get('/sisa-potong/:barcode', realisasiController.getSisaPotongByBarcode);

// Ambil data analisis vertikal (GET /api/realisasi/hasil/vertikal)
router.get('/hasil/vertikal', realisasiController.getHasilRealisasiVertikal);

// Ambil data analisis horizontal (GET /api/realisasi/hasil/horizontal)
router.get('/hasil/horizontal', realisasiController.getHasilRealisasiHorizontal);

// Update data realisasi (PUT /api/realisasi/:id)
router.put('/:id', requireRole('Supervisor', 'PPC', 'Superadmin'), realisasiController.updateRealisasi);

// Hapus data realisasi (DELETE /api/realisasi/:id)
router.delete('/:id', requireRole('Supervisor', 'PPC', 'Superadmin'), realisasiController.deleteRealisasi);

module.exports = router;
