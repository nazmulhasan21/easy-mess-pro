const Meal = require('../models/mealModel');
const Month = require('../models/monthModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const meal = require('./getUpdateDeleteController');
const moment = require('moment');

// const { getLastDayUserMeal } = require('../utils/fun');
const Mess = require('../models/messModel');

exports.getMealList = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { startDate, endDate, day } = query;
    // filter
    // 1. filter in date
    let dateFilter = {};
    if (startDate || endDate) {
      date = {
        date: {
          $gte: moment(startDate).startOf('day'),
          $lte: moment(endDate).endOf('day'),
        },
      };
    } else if (day) {
      dateFilter = {
        date: {
          $gte: moment(day).startOf('day'),
          $lte: moment(day).endOf('day'),
        },
      };
    }
    /// user filter
    const userId = req.query.userId || '';
    const userIdFilter = userId ? { userId } : {};
    // breakfast filter
    const breakfast = req.query.breakfast || '';
    const breakfastFilter = breakfast ? { breakfast } : {};

    // lunch filter
    const lunch = req.query.lunch || '';
    const lunchFilter = lunch ? { lunch } : {};

    // dinner filter
    const dinner = req.query.dinner || '';
    const dinnerFilter = dinner ? { dinner } : {};
    // totalMeal filter
    const total = req.query.total || '';
    const totalFilter = total
      ? {
          total: {
            $gte: total.split('-')[0],
            $lte: total.split('-')[1],
          },
        }
      : {};
    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    // query
    const findQuery = {
      $and: [
        { monthId: activeMonth._id },
        dateFilter,
        userIdFilter,
        breakfastFilter,
        lunchFilter,
        dinnerFilter,
        totalFilter,
      ],
    };
    // 2. get all cost in active month
    const features = new APIFeatures(
      Meal.find(findQuery)
        .populate('addBy editBy userId', 'name avatar role')
        .sort({ createdAt: -1 }),
      req.query
    ).paginate();
    const doc = await features.query;
    const results = await Meal.countDocuments(findQuery);

    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      data: {
        data: doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

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
    // check add now day meal in active month
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
      const total = myMeal.breakfast + myMeal.lunch + myMeal.dinner;
      // 4. post daily meal
      const userMeal = await Meal.create({
        ...myMeal,
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
exports.getLastDayMeal = async (req, res, next) => {
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
        }).populate('userId', 'name avatar');

        const userMeal = userMeals[userMeals.length - 1];
        // create new
        const meal = {
          userId: userId,
          user: { name: userId.name, role: userId.role, avatar: userId.avatar },
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
exports.getMeal = meal.getOne(Meal);
exports.updateMeal = meal.updateOne(Meal, 'meal');
exports.deleteMeal = meal.deleteOne(Meal, 'meal');
