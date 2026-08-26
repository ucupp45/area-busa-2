const express = require('express');
const router = express.Router();
const mesinManpowerController = require('../controllers/mesinManpowerController');

router.get('/', mesinManpowerController.getManpower);
router.put('/:id', mesinManpowerController.updateManpower);

module.exports = router;
