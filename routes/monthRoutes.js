const express = require('express');
const router = express.Router();

const {
  protect,
  restrictToMessId,
  restrictTo,
  checkPassword,
  restrictToAdmin,
} = require('../controllers/authController');
const monthController = require('../controllers/monthController');

router.get('/:messId/pdf', monthController.getPDF);
// Protect all routes after this middleware

router.use(protect);

// Only manager have permission to access for the below APIs

router.use(restrictToMessId);

router.get('/chart', monthController.getMonthChart);
router.get('/auto-meal-update', monthController.getAutoMealOption);
router.get('/:id', monthController.getMonth);
router.get('/', monthController.getActiveMonth);

router.patch('/:id/status', restrictToAdmin, monthController.changeMonthStatus);

router.patch(
  '/',
  restrictTo('manager', 'subManager'),
  monthController.addFixedMeal
);
router.patch(
  '/auto-meal-update',
  restrictTo('manager', 'subManager'),
  monthController.autoMealUpdate
);

router.use(restrictTo('manager'));
// check password
router.use(checkPassword);
router.post('/', monthController.createMonth);

router.delete('/:id', monthController.deleteMonth);

module.exports = router;
