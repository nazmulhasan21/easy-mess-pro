const express = require('express');
const router = express.Router();

// middleware

const authController = require('../controllers/authController');
const riceController = require('../controllers/riceController');

// Protect all routes after this middleware

router.use(authController.protect);

router.use(authController.restrictToMessId);
router.get('/', riceController.getRiceList);
router.get('/:id', riceController.getRice);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', riceController.createRice);
router
  .route('/:id')
  .patch(riceController.updateRice)
  .delete(riceController.deleteRice);

module.exports = router;
