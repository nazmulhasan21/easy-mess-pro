const express = require('express');
const router = express.Router();

const {
  protect,
  restrictToMessId,
  checkPassword,
  restrictTo,
} = require('../controllers/authController');
const subManagerController = require('../controllers/subManagerController');

// Protect all routes after this middleware

router.use(protect);
router.use(restrictToMessId);

router.get('/', subManagerController.getSubManagerList);

// Only active month manager have permission to access for the below APIs
router.use(restrictTo('manager', 'subManager'));
router.use(checkPassword);
router
  .route('/:userId')
  .patch(subManagerController.addSubManager)
  .delete(subManagerController.deleteSubManager);

module.exports = router;
