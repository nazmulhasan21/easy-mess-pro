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
router.get('/last-day-meal', mealController.getAllBorderLastDayMeal);
router.get('/meal-board', mealController.getMealBoard);

router.get('/personal-today-meal', mealController.getPersonalTodayMeal);
router.get('/personal-tomorrow-meal', mealController.getPersonalTomorrowMeal);
router.get('/auto-meal-on-of', mealController.getAutoMealOnOf);
router.patch('/auto-meal-on-of', mealController.autoMealOnOf);

router.get('/:id', mealController.getMeal);
router.patch('/:id/personal', mealController.updateMyMeal);

// Only manager have permission to access for the below APIs
router.use(restrictTo('manager', 'subManager'));

router.post('/', mealController.createMeal);
router.post('/single-meal', mealController.addSingleMeal);
router.patch('/:id', mealController.updateMeal);
// router.delete('/:id', checkPassword, mealController.deleteMeal);

module.exports = router;
