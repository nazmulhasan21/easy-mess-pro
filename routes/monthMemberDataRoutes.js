const express = require('express');
const router = express.Router();

// middleware

const {
  protect,
  restrictTo,
  checkPassword,
  restrictToMessId,
} = require('../controllers/authController');
const monthMemberDataController = require('../controllers/monthMemberDataController');
const {
  addMonthMemberDataInputValidated,
} = require('../middleware/inputValidation');

// Protect all routes after this middleware

router.use(protect);

router.use(restrictToMessId);
router.get('/', monthMemberDataController.getMonthMemberDataList);
router.get('/:id', monthMemberDataController.getMonthMemberData);

// Only manager have permission to access for the below APIs
router.use(restrictTo('manager', 'subManager'));

router.post(
  '/',
  addMonthMemberDataInputValidated,
  monthMemberDataController.createMonthMemberData
);
router.route('/:id').patch(monthMemberDataController.updateMonthMemberData);
router.delete(
  '/:id',
  checkPassword,
  monthMemberDataController.deleteMonthMemberData
);

module.exports = router;
