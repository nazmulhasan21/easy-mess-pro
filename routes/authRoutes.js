const express = require('express');
const router = express.Router();

const {
  signupValidate,
  emailCodeInValid,
} = require('../middleware/inputValidation');
const authController = require('../controllers/authController');

router.post('/signup', signupValidate, authController.signup);

router.post(
  '/send-verification-code',
  authController.sendEmailVerificationCode
);
router.post('/verification', emailCodeInValid, authController.verification);
router.post('/login', authController.login);
module.exports = router;
