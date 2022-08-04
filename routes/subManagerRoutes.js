const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const subManagerContorller = require('../controllers/subManagerContorller');

// Protect all routes after this middleware

router.use(authController.protect);
router.use(authController.restrictToMessId);

router.get('/', subManagerContorller.getSubManagerList);

// Only active month manager have permission to access for the below APIs
router.use(authController.restrictTo('manager'));
router.use(authController.chackPassword);
router
  .route('/:userId')
  .patch(subManagerContorller.addSubManager)
  .delete(subManagerContorller.deleteSubManager);

module.exports = router;
