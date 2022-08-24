const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const managerContorller = require('../controllers/managerController');

// Protect all routes after this middleware

router.use(authController.protect);
router.use(authController.restrictToMessId);
router.use(authController.restrictToAdmin);
router.use(authController.checkPassword);

router.route('/:userId').patch(managerContorller.changeManager);

module.exports = router;
