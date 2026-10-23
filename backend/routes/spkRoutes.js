const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const spkController = require('../controllers/spkController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Semua route SPK memerlukan autentikasi
router.use(verifyToken);

// Route untuk preview (Baca Excel/PDF tanpa simpan) - PPC & Superadmin
router.post('/preview', requireRole('PPC', 'Superadmin'), upload.single('spk_file'), spkController.previewSPK);

// Route untuk refresh preview dengan data matriks terbaru - PPC & Superadmin
router.post('/refresh-preview', requireRole('PPC', 'Superadmin'), spkController.refreshPreview);

// Route untuk preview raw data (Pasted dari Excel) - PPC & Superadmin
router.post('/preview-raw', requireRole('PPC', 'Superadmin'), spkController.previewRaw);

// Route untuk kalkulasi single row (Manual SPK) - PPC & Superadmin
router.post('/calculate-single', requireRole('PPC', 'Superadmin'), spkController.calculateSingleRow);

// Route untuk kalkulasi akhir semua mesin (Vertikal, Horizontal, Carousel) - PPC & Superadmin
router.post('/calculate-summary', requireRole('PPC', 'Superadmin'), spkController.calculateSummary);

// Route untuk menyimpan data yang sudah divalidasi ke Database - PPC & Superadmin
router.post('/save', requireRole('PPC', 'Superadmin'), spkController.saveSPK);

// Rute untuk mengambil riwayat SPK
router.get('/history', spkController.getHistory);
router.get('/history/:id', spkController.getHistoryDetail);

// Rute untuk mengunduh dokumen fisik SPK secara aman dan terautentikasi
router.get('/download/:id', requireRole('PPC', 'Superadmin', 'Supervisor', 'Operator'), spkController.downloadSPK);

// Rute untuk mendapatkan CT (Cycle Time) berdasar nama item
router.post('/get-ct', spkController.getCT);

// Rute untuk sinkronisasi tinggi short block matrix ke DB - PPC & Superadmin
router.post('/update-tinggi-matrix', requireRole('PPC', 'Superadmin'), spkController.updateTinggiMatrix);

// Rute baru untuk sinkronisasi existingWaktu
router.get('/existing-waktu', spkController.getExistingWaktu);

// Rute baru untuk menarik rekapan stok dari data SPK
router.get('/rekap-stok', spkController.getRekapStok);

// Rute baru untuk menarik total waktu efisiensi
router.get('/efisiensi', spkController.getEfisiensi);

// Rute untuk dashboard utama
const dashboardController = require('../controllers/dashboardController');
router.get('/dashboard', dashboardController.getDashboardData);

// Rute untuk Update (Ganti Nama / Edit Demand) dan Delete History - PPC & Superadmin
router.put('/history/:id', requireRole('PPC', 'Superadmin'), spkController.updateSPK);
router.delete('/history/:id', requireRole('PPC', 'Superadmin'), spkController.deleteSPK);

// Rute untuk Update Catatan Kualitas Produksi
router.post('/quality', requireRole('Operator', 'Supervisor', 'PPC', 'Superadmin'), spkController.updateQuality);

// Rute untuk Chart Histori 7 Hari
router.get('/chart', spkController.getChartData);

// Rute untuk kalkulasi OEE (Strict Method)
router.post('/calculate-oee', spkController.calculateOEE);

// Rute untuk mengambil data WO aktif (belum terpenuhi)
router.get('/wo/active', spkController.getActiveWOs);

// Rute untuk validasi duplikasi nomor WO
router.get('/check-wo', spkController.checkWO);

module.exports = router;