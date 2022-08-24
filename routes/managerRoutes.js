const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const managerController = require('../controllers/managerController');

// Protect all routes after this middleware

router.use(authController.protect);
router.use(authController.restrictToMessId);
router.use(authController.restrictToAdmin);
router.use(authController.checkPassword);

router.route('/:userId').patch(managerController.changeManager);

module.exports = router;
