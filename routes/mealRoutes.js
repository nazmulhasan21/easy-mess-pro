const express = require('express');
const router = express.Router();

// middleware

const {
  protect,
  restrictToMessId,
  restrictTo,
  checkPassword,
} = require('../controllers/authController');
const mealController = require('../controllers/mealController');

// Protect all routes after this middleware
router.use(protect);
router.use(restrictToMessId);

router.get('/', mealController.getMealList);
router.get('/last-day', mealController.getLastDayMeal);
router.get('/:id', mealController.getMeal);
router.patch('/:id/personal', mealController.updateMyMeal);

// Only manager have permission to access for the below APIs
router.use(restrictTo('manager', 'subManager'));

router.post('/', mealController.createMeal);
router.route('/:id').patch(mealController.updateMeal);
// router.delete('/:id', checkPassword, mealController.deleteMeal);

module.exports = router;
