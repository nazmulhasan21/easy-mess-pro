const express = require('express');

const router = express.Router();

const {
  protect,
  restrictToMessId,
  restrictTo,
  checkPassword,
  restrictToAdmin,
} = require('../controllers/authController');
const messController = require('../controllers/messController');
const { addMemberEmailValidated } = require('../middleware/inputValidation');

// Protect all routes after this middleware

router.use(protect);

router.post('/', restrictTo('manager'), messController.createMess);

// Only This user have messId to access for the below ApIs
router.use(restrictToMessId);

router.get('/', messController.getMess);
router.get('/member', messController.getAllMember);
router.get('/member-missing-rollNo', messController.getAllMissingRollNo);
router.get('/member/:id', messController.getMember);
router.get('/month', messController.getMonthList);

// Only admin have permission to access for the below APIs
router.use(restrictToAdmin);

router.patch('/member', addMemberEmailValidated, messController.addMember);

// Only admin inter your password have permission to access for the below APIs

router.use(checkPassword);
router.delete('/member/:id', messController.deleteMember);

router.patch('/admin/:id', messController.changeAdmin);
router.delete('/', messController.deleteMess);

module.exports = router;
