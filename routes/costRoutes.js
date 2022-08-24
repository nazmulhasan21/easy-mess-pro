const express = require('express');
const router = express.Router();

// middleware
const { addCostInputValidated } = require('../middleware/inputValidation');

const authController = require('../controllers/authController');
const costController = require('../controllers/costController');

// Protect all routes after this middleware

router.use(authController.protect);

router.use(authController.restrictToMessId);
router.get('/', costController.getCostList);
router.get('/:id', costController.getCost);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', addCostInputValidated, costController.createCost);
router.route('/:id').patch(costController.updateCost);
router.delete('/:id', authController.checkPassword, costController.deleteCost);

module.exports = router;
