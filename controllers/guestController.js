const GuestMeal = require('../models/guestMealModel');
const guestMeal = require('./userCashOrRichController');

exports.getGuestMealList = guestMeal.getList(GuestMeal);
exports.getGuestMeal = guestMeal.getOne(GuestMeal, 'guestMeal');
exports.createGuestMeal = guestMeal.createOne(GuestMeal, 'guestMeal');
exports.updateGuestMeal = guestMeal.updateOne(GuestMeal, 'guestMeal');
exports.deleteGuestMeal = guestMeal.deleteOne(GuestMeal, 'guestMeal');
