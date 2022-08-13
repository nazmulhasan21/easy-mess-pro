const express = require('express');
const router = express.Router();

const {
  signupValidat,
  emailCodeInVali,
  emailVelit,
} = require('../middleware/inputeValidation');
const authController = require('../controllers/authController');

router.post('/signup', signupValidat, authController.signup);

router.post('/send-verification-code', authController.sendEmailVerifiCode);
router.post('/verification', emailCodeInVali, authController.verification);
router.post('/login', authController.login);
module.exports = router;
