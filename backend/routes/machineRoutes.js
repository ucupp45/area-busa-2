const express = require('express');
const router = express.Router();
const mc = require('../controllers/machineController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Semua route machine memerlukan autentikasi
router.use(verifyToken);

// GET semua health mesin hari ini (query: ?tanggal=YYYY-MM-DD&shift=1)
router.get('/health', mc.getMachineHealth);

// GET mesin yang tersedia (tidak maintenance)
router.get('/available', mc.getAvailableMachines);

// POST update downtime (dari operator / PPC / supervisor / superadmin)
router.post('/downtime', requireRole('Operator', 'Supervisor', 'PPC', 'Superadmin'), mc.updateDowntime);

// PUT toggle maintenance status (hanya Supervisor, PPC, Superadmin)
router.put('/:mesin_id/maintenance', requireRole('Supervisor', 'PPC', 'Superadmin'), mc.toggleMaintenance);

module.exports = router;
