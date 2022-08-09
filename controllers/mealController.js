const Meal = require('../models/mealModel');
const Month = require('../models/monthModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const meal = require('./userCashOrRichController');
const moment = require('moment');

exports.getMealList = meal.getList(Meal);
exports.getMeal = meal.getOne(Meal, 'meal');

exports.createMeal = async (req, res, next) => {
  try {
    const { user } = req;
    const dailyMealArray = req.body;

    //1. find active month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).select('meals');
    if (!month)
      return next(new AppError(404, 'month', 'No found active month'));
    // chack add now day meal in active month
    const today = moment().startOf('day');
    const meals = await Meal.find({
      date: {
        $gte: today.toDate(),
        $lte: moment(today).endOf('day').toDate(),
      },
    });
    //
    if (meals)
      return next(
        new AppError(
          401,
          'meals',
          'All ready add today meals. Please Try in next day or Update meals'
        )
      );

    //  3. daily Meal array to daily meal object
    dailyMealArray.forEach(async (myMeal) => {
      const { name } = await User.findById(myMeal.userId).select('name');
      const total = myMeal.breakfast + myMeal.lunch + myMeal.dinner;
      // 4. post daily meal
      const userMeal = await Meal.create({
        ...myMeal,
        userName: name,
        total: total,
        messId: user.messId,
        monthId: month._id,
        addBy: user._id,
      });

      // push this userMeal in active month
      month.meals.push(userMeal);
      await month.save();
    });

    // 5. send res
    res.status(201).json({
      status: 'success',
      message: `add meal successfully`,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMeal = meal.updateOne(Meal, 'meal');
exports.deleteMeal = meal.deleteOne(Meal, 'meal');
