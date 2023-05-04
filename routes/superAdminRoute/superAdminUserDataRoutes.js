const express = require('express');
const router = express.Router();

// middleware

const {
  protect,
  restrictToMessId,
  restrictTo,
  checkPassword,
} = require('../../controllers/authController');
const superAdminUserDataController = require('../../controllers/superAdminControler/superAdminUserDataController');

// Protect all routes after this middleware

//router.use(protect);

//router.use(restrictToMessId);
router.delete('/:id', superAdminUserDataController.deleteOne);

router.delete('/meal/:monthId', superAdminUserDataController.deleteOndDayMeal);

module.exports = router;
