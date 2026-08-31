const express = require('express');
const router = express.Router();
const matrixController = require('../controllers/matrixController');

router.get('/', matrixController.getAllMatrix);
router.post('/', matrixController.addMatrixItem);
router.put('/varians', matrixController.updateMatrixVarians);
router.put('/item', matrixController.updateMatrixItem);
router.delete('/delete-by-name', matrixController.deleteMatrixItemByName);
router.delete('/varians', matrixController.deleteMatrixVarians);
router.delete('/:id', matrixController.deleteMatrixItem);

module.exports = router;
