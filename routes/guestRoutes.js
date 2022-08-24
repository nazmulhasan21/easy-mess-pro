const express = require('express');
const router = express.Router();

// middleware

const authController = require('../controllers/authController');
const guestContorller = require('../controllers/guestController');

// Protect all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictToMessId);

router.get('/', guestContorller.getGuestMealList);
router.get('/:id', guestContorller.getGuestMeal);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', guestContorller.createGuestMeal);
router.route('/:id').patch(guestContorller.updateGuestMeal);
router.delete(
  '/:id',
  authController.checkPassword,
  guestContorller.deleteGuestMeal
);

module.exports = router;
