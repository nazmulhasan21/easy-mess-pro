const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const {
  protect,
  checkPassword,
  sendEmailVerificationCode,
} = require('../controllers/authController');

const {
  addMemberEmailValidated,
  chPassInValid,
  updateMeValidate,
  emailCodeInValid,
  emailValid,
  isEmailInput,
} = require('../middleware/inputValidation');

// If any User forget her password then use after 3 router

router.post(
  '/send-forget-password-verficition-code',
  isEmailInput,
  userController.sendForgetPasswordVerificationCode
);
router.post(
  '/forget-password-email-verification',
  emailCodeInValid,
  userController.emailVerification
);

router.patch('/reset-password', emailCodeInValid, userController.resatPassword);
router.get('/', userController.getAllUser);
// Protect all routes after this middleware
router.use(protect);

router
  .route('/me')
  .get(userController.me)
  .patch(updateMeValidate, userController.updateMe);
router.patch('/me/avatar', userController.updateAvatar);
router.patch('/me/password', chPassInValid, userController.changePassword);

router.post(
  '/me/send-email-change-verification-code',
  emailValid,
  sendEmailVerificationCode
);
router.patch('/me/email', emailCodeInValid, userController.changeEmail);

router.patch('/update-fcm-token', userController.userFCMTokenUpdate);

// router.route('/').get(userController.getAllUsers);
router.delete('/log-out', userController.logOut);
router.delete('/me/delete', checkPassword, userController.deleteMe);
router.route('/:id').get(userController.getUser);
router.post('/email', addMemberEmailValidated, userController.getUserByEmail);

module.exports = router;
