const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Semua rute audit log memerlukan autentikasi dan hanya dapat diakses oleh Superadmin atau Supervisor
router.use(verifyToken);
router.get('/', requireRole('Superadmin', 'Supervisor'), auditController.getAuditLogs);

module.exports = router;
