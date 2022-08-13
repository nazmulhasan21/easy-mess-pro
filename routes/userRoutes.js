const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { json } = require('body-parser');
const {
  addMemberEmailValidat,
  chPassInVali,
  updateMeValidat,
  emailCodeInVali,
  emailVelit,
  isEmailInput,
} = require('../middleware/inputeValidation');

// If any User forget her password then use after 3 router

router.post(
  '/send-forget-password-verficition-code',
  isEmailInput,
  userController.sendForgetPasswordVerfiCode
);
router.post(
  '/forget-password-email-verification',
  emailCodeInVali,
  userController.emailVerification
);

router.patch('/reset-password', emailCodeInVali, userController.restePassword);

// Protect all routes after this middleware
router.use(authController.protect);

router
  .route('/me')
  .get(userController.me)
  .patch(updateMeValidat, userController.updateMe);
router.patch('/me/avater', userController.updateAvater);
router.patch('/me/password', chPassInVali, userController.changePassword);

router.post(
  '/me/send-email-change-verification-code',
  emailVelit,
  authController.sendEmailVerifiCode
);
router.patch('/me/email', emailCodeInVali, userController.changeEmail);

// Only admin have permmission to access for the below APIs

// router.route('/').get(userController.getAllUsers);
router.delete('/log-out', userController.logOut);
router.route('/:id').get(userController.getUser);
router.post('/email', addMemberEmailValidat, userController.getUserByEmail);
module.exports = router;
