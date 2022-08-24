const express = require('express');

const router = express.Router();

const authController = require('../controllers/authController');
const messController = require('../controllers/messController');
const { addMemberEmailValidated } = require('../middleware/inputValidation');

// Protect all routes after this middleware

router.use(authController.protect);

router.post(
  '/',
  authController.restrictTo('manager'),
  messController.createMess
);

// Only This user have messId to access for the below ApIs
router.use(authController.restrictToMessId);

router.get('/', messController.getMess);
router.get('/member', messController.getAllMember);
router.get('/member/:id', messController.getMember);

// Only admin have permission to access for the below APIs
router.use(authController.restrictToAdmin);

router.patch('/member', addMemberEmailValidated, messController.addMember);

// Only admin inter your password have permission to access for the below APIs
router.use(authController.restrictToAdmin);
router.use(authController.checkPassword);
router.delete('/member/:id', messController.deleteMember);

router.patch('/admin/:id', messController.changeAdmin);
router.delete('/', messController.deleteMess);

module.exports = router;
