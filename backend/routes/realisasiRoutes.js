const express = require('express');
const router = express.Router();
const realisasiController = require('../controllers/realisasiController');

// Simpan data realisasi baru (POST /api/realisasi)
router.post('/', realisasiController.createRealisasi);

// Ambil semua data realisasi (GET /api/realisasi)
router.get('/', realisasiController.getAllRealisasi);

// Ambil data analisis vertikal (GET /api/realisasi/hasil/vertikal)
router.get('/hasil/vertikal', realisasiController.getHasilRealisasiVertikal);

// Ambil data analisis horizontal (GET /api/realisasi/hasil/horizontal)
router.get('/hasil/horizontal', realisasiController.getHasilRealisasiHorizontal);

// Update data realisasi (PUT /api/realisasi/:id)
router.put('/:id', realisasiController.updateRealisasi);

// Hapus data realisasi (DELETE /api/realisasi/:id)
router.delete('/:id', realisasiController.deleteRealisasi);

module.exports = router;
