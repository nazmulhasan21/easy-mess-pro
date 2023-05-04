const express = require('express');
const router = express.Router();

// middleware

const {
  protect,
  restrictToMessId,
  restrictTo,
  checkPassword,
} = require('../../controllers/authController');
const superAdminMonthController = require('../../controllers/superAdminControler/superAdminMonthController');

// Protect all routes after this middleware

//router.use(protect);

//router.use(restrictToMessId);
router.get('/:id', superAdminMonthController.getActiveMonth);

router.delete('/:id', superAdminMonthController.deleteMonth);

module.exports = router;
