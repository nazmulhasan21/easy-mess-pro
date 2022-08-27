const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const monthController = require('../controllers/monthController');

// Protect all routes after this middleware

router.use(authController.protect);

// Only manager have permission to access for the below APIs

router.use(authController.restrictToMessId);

router.get('/pdf', monthController.getPDF);
// router.get('/', monthController.getMonthList);
router.get('/:id', monthController.getMonth);
router.get('/', monthController.getActiveMonth);
router.get('/month-list', monthController.getMonthList);

router.use(authController.restrictTo('manager', 'subManager'));
router.patch('/', monthController.addFixedMeal);

router.use(authController.restrictTo('manager'));

router.post('/', monthController.createMonth);

router.delete(
  '/:id',
  authController.checkPassword,
  monthController.deleteMonth
);
router.use(authController.restrictToAdmin);
router.patch('/:id/status', monthController.changeMonthStatus);

module.exports = router;
