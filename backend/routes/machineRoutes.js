const express = require('express');
const router = express.Router();
const mc = require('../controllers/machineController');

// GET semua health mesin hari ini (query: ?tanggal=YYYY-MM-DD&shift=1)
router.get('/health', mc.getMachineHealth);

// GET mesin yang tersedia (tidak maintenance)
router.get('/available', mc.getAvailableMachines);

// POST update downtime (dari operator)
router.post('/downtime', mc.updateDowntime);

// PUT toggle maintenance status
router.put('/:mesin_id/maintenance', mc.toggleMaintenance);

module.exports = router;
