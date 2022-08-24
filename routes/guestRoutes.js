const express = require('express');
const router = express.Router();

// middleware

const authController = require('../controllers/authController');
const guestController = require('../controllers/guestController');

// Protect all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictToMessId);

router.get('/', guestController.getGuestMealList);
router.get('/:id', guestController.getGuestMeal);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', guestController.createGuestMeal);
router.route('/:id').patch(guestController.updateGuestMeal);
router.delete(
  '/:id',
  authController.checkPassword,
  guestController.deleteGuestMeal
);

module.exports = router;
