const express = require('express');
const router = express.Router();

// middleware
const { addCostInputValidat } = require('../middleware/inputeValidation');

const authController = require('../controllers/authController');
const mealContorller = require('../controllers/mealController');

// Protect all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictToMessId);

router.get('/', mealContorller.getMealList);
router.get('/:id', mealContorller.getMeal);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', mealContorller.createMeal);
router.route('/:id').patch(mealContorller.updateMeal);
router.delete('/:id', authController.chackPassword, mealContorller.deleteMeal);

module.exports = router;
