const express = require('express');
const router = express.Router();
const matrixController = require('../controllers/matrixController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Semua route matriks memerlukan autentikasi
router.use(verifyToken);

// Read matrix: diakses oleh semua pengguna terotentikasi
router.get('/', matrixController.getAllMatrix);

// Create / Update matrix: hanya Superadmin dan PPC
router.post('/', requireRole('Superadmin', 'PPC'), matrixController.addMatrixItem);
router.put('/varians', requireRole('Superadmin', 'PPC'), matrixController.updateMatrixVarians);
router.put('/item', requireRole('Superadmin', 'PPC'), matrixController.updateMatrixItem);

// Delete matrix / varian: hanya Superadmin
router.delete('/delete-by-name', requireRole('Superadmin'), matrixController.deleteMatrixItemByName);
router.delete('/varians', requireRole('Superadmin'), matrixController.deleteMatrixVarians);
router.delete('/:id', requireRole('Superadmin'), matrixController.deleteMatrixItem);

module.exports = router;
