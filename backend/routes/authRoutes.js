const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Route Publik
router.post('/login', authController.login);

// Route Terproteksi
router.get('/me', verifyToken, authController.getMe);
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;
