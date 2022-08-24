const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const subManagerController = require('../controllers/subManagerController');

// Protect all routes after this middleware

router.use(authController.protect);
router.use(authController.restrictToMessId);

router.get('/', subManagerController.getSubManagerList);

// Only active month manager have permission to access for the below APIs
router.use(authController.restrictTo('manager'));
router.use(authController.checkPassword);
router
  .route('/:userId')
  .patch(subManagerController.addSubManager)
  .delete(subManagerController.deleteSubManager);

module.exports = router;
