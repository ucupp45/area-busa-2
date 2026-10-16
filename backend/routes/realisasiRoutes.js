const express = require('express');
const router = express.Router();
const realisasiController = require('../controllers/realisasiController');

// Simpan data realisasi baru (POST /api/realisasi)
router.post('/', realisasiController.createRealisasi);

// Ambil semua data realisasi (GET /api/realisasi)
router.get('/', realisasiController.getAllRealisasi);

// Ambil semua stok sisa potong (GET /api/realisasi/sisa-potong/all)
router.get('/sisa-potong/all', realisasiController.getAllSisaPotong);

// CRUD Stok Sisa Potong Manual
router.post('/sisa-potong', realisasiController.createSisaPotongManual);
router.put('/sisa-potong/:id', realisasiController.updateSisaPotong);
router.delete('/sisa-potong/:id', realisasiController.deleteSisaPotong);

// Ambil sisa potong berdasarkan barcode (GET /api/realisasi/sisa-potong/:barcode)
router.get('/sisa-potong/:barcode', realisasiController.getSisaPotongByBarcode);

// Ambil data analisis vertikal (GET /api/realisasi/hasil/vertikal)
router.get('/hasil/vertikal', realisasiController.getHasilRealisasiVertikal);

// Ambil data analisis horizontal (GET /api/realisasi/hasil/horizontal)
router.get('/hasil/horizontal', realisasiController.getHasilRealisasiHorizontal);

// Update data realisasi (PUT /api/realisasi/:id)
router.put('/:id', realisasiController.updateRealisasi);

// Hapus data realisasi (DELETE /api/realisasi/:id)
router.delete('/:id', realisasiController.deleteRealisasi);

module.exports = router;
