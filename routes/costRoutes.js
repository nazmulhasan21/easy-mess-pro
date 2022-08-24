const express = require('express');
const router = express.Router();

// middleware
const { addCostInputValidated } = require('../middleware/inputValidation');

const authController = require('../controllers/authController');
const costContorller = require('../controllers/costController');

// Protect all routes after this middleware

router.use(authController.protect);

router.use(authController.restrictToMessId);
router.get('/', costContorller.getCostList);
router.get('/:id', costContorller.getCost);

// Only manager have permission to access for the below APIs
router.use(authController.restrictTo('manager', 'subManager'));

router.post('/', addCostInputValidated, costContorller.createCost);
router.route('/:id').patch(costContorller.updateCost);
router.delete('/:id', authController.checkPassword, costContorller.deleteCost);

module.exports = router;
