const express = require('express');

const router = express.Router();

const authController = require('../controllers/authController');
const messContorller = require('../controllers/messController');

const { addMemberEmailValidat } = require('../middleware/inputeValidation');

// Protect all routes after this middleware

router.use(authController.protect);

router.post(
  '/',
  authController.restrictTo('manager'),
  messContorller.createMess
);

// Only This user have messId to access for the below ApIs
router.use(authController.restrictToMessId);

router.get('/', messContorller.getMess);
router.get('/member', messContorller.getAllMember);
router.get('/member/:id', messContorller.getMember);

// Only admin have prermission to access for the below APIs
router.use(authController.restrictToAdmin);

router.patch('/member', addMemberEmailValidat, messContorller.addMember);

// Only admin inter your password have prermission to access for the below APIs
router.use(authController.chackPassword);
router.delete('/member/:id', messContorller.deleteMember);

router.patch('/admin/:id', messContorller.changeAdmin);
router.delete('/', messContorller.deleteMess);

module.exports = router;
