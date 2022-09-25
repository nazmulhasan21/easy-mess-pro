const express = require('express');
const router = express.Router();

const {
  protect,
  restrictToMessId,
  checkPassword,
  restrictToAdmin,
} = require('../controllers/authController');
const managerController = require('../controllers/managerController');

// Protect all routes after this middleware

router.use(protect);
router.use(restrictToMessId);
router.use(restrictToAdmin);
router.use(checkPassword);

router.route('/:userId').patch(managerController.changeManager);

module.exports = router;
