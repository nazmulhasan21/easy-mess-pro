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

// Protect all routes after this middleware

router.use(protect);

// Only manager have permission to access for the below APIs

router.use(restrictToMessId);

router.get('/pdf', monthController.getPDF);
// router.get('/', monthController.getMonthList);
router.get('/:id', monthController.getMonth);
router.get('/', monthController.getActiveMonth);

router.use(restrictTo('manager', 'subManager'));
router.patch('/', monthController.addFixedMeal);

router.use(restrictTo('manager'));
// check password

router.post('/', checkPassword, monthController.createMonth);

router.delete('/:id', checkPassword, monthController.deleteMonth);

router.use(restrictToAdmin);
router.patch('/:id/status', monthController.changeMonthStatus);

module.exports = router;
