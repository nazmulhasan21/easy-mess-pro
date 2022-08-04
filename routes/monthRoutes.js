const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const monthContorller = require('../controllers/monthController');

// Protect all routes after this middleware
router.get('/pdf', monthContorller.getPDF);
router.use(authController.protect);

// Only manager have permission to access for the below APIs

router.use(authController.restrictToMessId);

router.get('/pdf', monthContorller.getPDF);
// router.get('/', monthContorller.getMonthList);
router.get('/:id', monthContorller.getMonth);
router.get('/', monthContorller.getActiveMonth);

router.use(authController.restrictTo('manager'));

router.post('/', monthContorller.createMonth);
router.patch('/', monthContorller.addFixedMeal);

router.delete(
  '/:id',
  authController.chackPassword,
  monthContorller.deleteMonth
);

module.exports = router;
