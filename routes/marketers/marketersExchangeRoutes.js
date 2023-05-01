const express = require('express');
const router = express.Router();

// middleware
const { addCostInputValidated } = require('../../middleware/inputValidation');

const {
  protect,
  restrictToMessId,
  restrictTo,
  checkPassword,
} = require('../../controllers/authController');
const marketersExchangeController = require('../../controllers/marketers/marketersExchangeController');

// Protect all routes after this middleware

router.use(protect);

router.use(restrictToMessId);

// get marketer exchange offer
router.get('/offer', marketersExchangeController.getMarketerExchangeOffer);
router.get(
  '/send-offer',
  marketersExchangeController.getMarketerExchangeSendOffer
);
router.get('/:id', marketersExchangeController.getMarketerExchanger);

router.patch('/:id/accept', marketersExchangeController.marketerExchangeAccept);
router.patch(
  '/:id/reject',
  checkPassword,
  marketersExchangeController.marketerExchangeReject
);

router.delete(
  '/:id',
  checkPassword,
  marketersExchangeController.deleteMarketersExchange
);

module.exports = router;
