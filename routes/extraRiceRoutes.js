const express = require('express');
const router = express.Router();

// middleware

const authController = require('../controllers/authController');
const extraRiceController = require('../controllers/extraRiceController');

// Protect all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictToMessId);

router.get('/', extraRiceController.getExtraRiceList);
router.get('/:id', extraRiceController.getExtraRice);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', extraRiceController.createExtraRice);
router.route('/:id').patch(extraRiceController.updateExtraRice);
router.delete(
  '/:id',
  authController.checkPassword,
  extraRiceController.deleteExtraRice
);

module.exports = router;
