const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const spkController = require('../controllers/spkController');

// Route untuk preview (Baca Excel/PDF tanpa simpan)
router.post('/preview', upload.single('spk_file'), spkController.previewSPK);

// Route untuk refresh preview dengan data matriks terbaru
router.post('/refresh-preview', spkController.refreshPreview);

// Route untuk kalkulasi single row (Manual SPK)
router.post('/calculate-single', spkController.calculateSingleRow);

// Route untuk kalkulasi akhir semua mesin (Vertikal, Horizontal, Carousel)
router.post('/calculate-summary', spkController.calculateSummary);

// Route untuk menyimpan data yang sudah divalidasi ke Database
router.post('/save', spkController.saveSPK);

// Rute baru untuk mengambil riwayat SPK
router.get('/history', spkController.getHistory);

// Rute untuk mendapatkan CT (Cycle Time) berdasar nama item
router.post('/get-ct', spkController.getCT);

// Rute untuk sinkronisasi tinggi short block matrix ke DB
router.post('/update-tinggi-matrix', spkController.updateTinggiMatrix);

// Rute baru untuk sinkronisasi existingWaktu
router.get('/existing-waktu', spkController.getExistingWaktu);

// Rute baru untuk menarik rekapan stok dari data SPK
router.get('/rekap-stok', spkController.getRekapStok);

// Rute baru untuk menarik total waktu efisiensi
router.get('/efisiensi', spkController.getEfisiensi);

// Rute untuk dashboard utama
const dashboardController = require('../controllers/dashboardController');
router.get('/dashboard', dashboardController.getDashboardData);

// Rute untuk Update (Ganti Nama) dan Delete History
router.put('/history/:id', spkController.updateSPK);
router.delete('/history/:id', spkController.deleteSPK);

// Rute untuk Update Catatan Kualitas Produksi
router.post('/quality', spkController.updateQuality);

// Rute untuk Chart Histori 7 Hari
router.get('/chart', spkController.getChartData);

// Rute untuk kalkulasi OEE (Strict Method)
router.post('/calculate-oee', spkController.calculateOEE);

// Rute untuk mengambil data WO aktif (belum terpenuhi)
router.get('/wo/active', spkController.getActiveWOs);

module.exports = router;