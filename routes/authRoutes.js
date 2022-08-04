const express = require('express');
const router = express.Router();

const { signupValidat } = require('../middleware/inputeValidation');
const authController = require('../controllers/authController');

router.post('/signup', signupValidat, authController.signup);
router.post('/login', authController.login);
module.exports = router;
