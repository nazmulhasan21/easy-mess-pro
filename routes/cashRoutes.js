const express = require('express');
const router = express.Router();

// middleware
const { addRiceOrCashInputValidate } = require('../middleware/inputValidation');

const authController = require('../controllers/authController');
const cashContorller = require('../controllers/cashController');

// Protect all routes after this middleware

router.use(authController.protect);

router.use(authController.restrictToMessId);
router.get('/', cashContorller.getCashList);
router.get('/:id', cashContorller.getCash);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', cashContorller.createCash);
router.route('/:id').patch(cashContorller.updateCash);
router.delete('/:id', authController.checkPassword, cashContorller.deleteCash);

module.exports = router;
