const express = require('express');
const router = express.Router();

const { updateMeValidat } = require('../middleware/inputeValidation');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { json } = require('body-parser');
const { addMemberEmailValidat } = require('../middleware/inputeValidation');

// Protect all routes after this middleware
router.use(authController.protect);

router
  .route('/me')
  .get(userController.me)
  .patch(updateMeValidat, userController.updateMe);
router.patch('/avater', userController.updateAvater);
// Only admin have permmission to access for the below APIs

// router.route('/').get(userController.getAllUsers);
router.delete('/log-out', userController.logOut);
router.route('/:id').get(userController.getUser);
router.post('/email', addMemberEmailValidat, userController.getUserByEmail);
module.exports = router;
