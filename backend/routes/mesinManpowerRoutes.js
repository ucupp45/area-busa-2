const express = require('express');
const router = express.Router();
const mesinManpowerController = require('../controllers/mesinManpowerController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Semua route mesin-manpower memerlukan autentikasi
router.use(verifyToken);

router.get('/', mesinManpowerController.getManpower);
router.put('/:id', requireRole('Superadmin', 'PPC'), mesinManpowerController.updateManpower);

module.exports = router;
