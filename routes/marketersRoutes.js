const express = require('express');
const router = express.Router();

// middleware
const { addCostInputValidated } = require('../middleware/inputValidation');

const {
  protect,
  restrictToMessId,
  restrictTo,
  checkPassword,
} = require('../controllers/authController');
const marketersController = require('../controllers/marketersController');

// Protect all routes after this middleware

router.use(protect);

router.use(restrictToMessId);
router.get('/', marketersController.getMarketersList);
router.get('/:id', marketersController.getMarketers);
router.patch('/:id', marketersController.marketerJoin);
router.patch('/:id', marketersController.marketerLeave);
router.post('/:id/exchange', marketersController.marketerExchange);

// Only manager have permission to access for the below APIs
router.use(restrictTo('manager', 'subManager'));

router.post('/', marketersController.createMarketers);
router.route('/:id').patch(marketersController.updateMarketers);
router.delete('/:id', checkPassword, marketersController.deleteMarketers);

module.exports = router;
