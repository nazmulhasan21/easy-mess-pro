const express = require('express');
const router = express.Router();

// middleware
const { addRichOrCashInputValidat } = require('../middleware/inputeValidation');

const authController = require('../controllers/authController');
const richContorller = require('../controllers/richController');

// Protect all routes after this middleware

router.use(authController.protect);

router.use(authController.restrictToMessId);
router.get('/', richContorller.getRichList);
router.get('/:id', richContorller.getRich);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', richContorller.createRich);
router
  .route('/:id')
  .patch(richContorller.updateRich)
  .delete(richContorller.deleteRich);

module.exports = router;
