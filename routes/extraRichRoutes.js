const express = require('express');
const router = express.Router();

// middleware

const authController = require('../controllers/authController');
const extraRichContorller = require('../controllers/extraRichController');

// Protect all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictToMessId);

router.get('/', extraRichContorller.getExtraRichList);
router.get('/:id', extraRichContorller.getExtraRich);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', extraRichContorller.createExtraRich);
router.route('/:id').patch(extraRichContorller.updateExtraRich);
router.delete(
  '/:id',
  authController.chackPassword,
  extraRichContorller.deleteExtraRich
);

module.exports = router;
