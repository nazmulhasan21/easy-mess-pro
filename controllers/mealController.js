const Meal = require('../models/mealModel');
const Month = require('../models/monthModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const meal = require('./userCashOrRichController');
const moment = require('moment');

const { getLastDayUserMeal } = require('../utils/fun');
const Mess = require('../models/messModel');

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
      $and: [
        { monthId: month._id },
        {
          date: {
            $gte: today.toDate(),
            $lte: moment(today).endOf('day').toDate(),
          },
        },
      ],
    });
    //c

    if (meals.length > 0)
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
exports.getLastdayMeal = async (req, res, next) => {
  try {
    const { user } = req;

    // 1 . find user mess
    const mess = await Mess.findOne(user.messId).select('allMember');
    // 2. find user active month
    const month = await Month.findOne({
      $and: [{ messId: mess._id }, { active: true }],
    });

    const meals = await Promise.all(
      mess.allMember.map(async (userId) => {
        // find user meal
        const userMeals = await Meal.find({
          $and: [{ userId: userId }, { monthId: month._id }],
        });

        const userMeal = userMeals[userMeals.length - 1];
        // create new
        const meal = {
          userId: userId,
          breakfast: userMeal?.breakfast || 0,
          lunch: userMeal?.lunch || 0,
          dinner: userMeal?.dinner || 0,
        };
        return meal;
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        data: meals,
      },
    });
  } catch (error) {
    next(error);
  }
};

const month = {
  _id: '62f896c095de0eabd15aef99',
  messId: '62f896c095de0eabd15aef97',
};

const test = async (userId, monthId) => {
  const usermeal = await Meal.find({
    $and: [{ monthId: monthId }, { userId: userId }],
  });
  const meal = usermeal[usermeal.length - 1];
  return meal;
};

//const meall = test('62f8961795de0eabd15aef8c', month._id);

//test('62f8a0c395de0eabd15aefa9', month._id);

exports.updateMeal = meal.updateOne(Meal, 'meal');
exports.deleteMeal = meal.deleteOne(Meal, 'meal');
