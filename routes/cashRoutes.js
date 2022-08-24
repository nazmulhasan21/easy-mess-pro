const express = require('express');
const router = express.Router();

// middleware

const authController = require('../controllers/authController');
const cashController = require('../controllers/cashController');

// Protect all routes after this middleware

router.use(authController.protect);

router.use(authController.restrictToMessId);
router.get('/', cashController.getCashList);
router.get('/:id', cashController.getCash);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', cashController.createCash);
router.route('/:id').patch(cashController.updateCash);
router.delete('/:id', authController.checkPassword, cashController.deleteCash);

module.exports = router;
