const Meal = require('../models/mealModel');
const Month = require('../models/monthModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const meal = require('./getUpdateDeleteController');
const moment = require('moment');
const _ = require('lodash');

// const { getLastDayUserMeal } = require('../utils/fun');
const Mess = require('../models/messModel');
const User = require('../models/userModel');
const UserMonthData = require('../models/userMonthDataModel');

exports.getMealList = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { startDate, endDate, day } = query;
    // filter
    // 1. filter in date
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {
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
    const doc = async () => {
      const data = await features.query;
      return data.map((item) => {
        return {
          _id: item._id,
          userId: item.userId,
          breakfast: item.breakfast,
          lunch: item.lunch,
          dinner: item.dinner,
          total: item.total,
          addBy: item.addBy,
          editBy: item.editBy,
          date: item.date,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });
    };

    const results = await Meal.countDocuments(findQuery);

    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      data: {
        data: await doc(),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createMeal = async (req, res, next) => {
  try {
    const { user } = req;
    const { meals } = req.body;
    const date = moment(req.body.date);
    if (date == '') {
      return next(new AppError(402, 'date', 'দয়া করে তারিখ নির্বাচন করুন।'));
    }

    //1. find active month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).select('meals date');
    if (!month)
      return next(new AppError(404, 'month', 'সক্রিয় মাস পাওয়া যায়নি'));
    // only add this month date
    const isMonthDate = moment(month.date).isSame(date, 'month');
    if (!isMonthDate)
      return next(
        new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন।')
      );
    // check add now day meal in active month
    const oldMeals = await Meal.find({
      $and: [
        { monthId: month._id },
        {
          date: {
            $gte: moment(date).startOf('day'),
            $lte: moment(date).endOf('day'),
          },
        },
      ],
    });
    //c

    if (oldMeals.length > 0)
      // meals.forEach(async (myMeal) => {
      //   const total = myMeal.breakfast + myMeal.lunch + myMeal.dinner;
      //   // 4. post daily meal
      //   const userMeal = await Meal.create({
      //     userId: myMeal.userId,
      //     breakfast: myMeal.breakfast,
      //     lunch: myMeal.lunch,
      //     dinner: myMeal.dinner,
      //     total: total,
      //     editBy: user._id,
      //   });
      // });
      return next(
        new AppError(
          403,
          'meals',
          `আগেই ${moment(date).format(
            'DD/MM/YY'
          )} এই তারিখের মিল যোগ করা আছে। অন্যদিনের মিল যোগ করতে তারিখ পরিবর্তন করুন।`
        )
      );

    //  3. daily Meal array to daily meal object
    meals.forEach(async (myMeal) => {
      const total = myMeal.breakfast + myMeal.lunch + myMeal.dinner;
      // 4. post daily meal
      const userMeal = await Meal.create({
        userId: myMeal.userId,
        breakfast: myMeal.breakfast,
        lunch: myMeal.lunch,
        dinner: myMeal.dinner,
        total: total,
        date: date,
        messId: user.messId,
        monthId: month._id,
        addBy: user._id,
      });
    });

    // 5. send res
    res.status(201).json({
      status: 'success',
      message: `সফলভাবে মিল যোগ করা হলো।`,
    });
  } catch (error) {
    next(error);
  }
};
exports.getLastDayMeal = async (req, res, next) => {
  try {
    const { user } = req;
    const { day } = req.query;
    let dateFilter = {};
    dateFilter = {
      date: {
        $gte: moment(day).startOf('day'),
        $lte: moment(day).endOf('day'),
      },
    };

    // 1 . find user mess
    const mess = await Mess.findById(user.messId).select('allMember');
    // 2. find user active month
    const month = await Month.findOne({
      $and: [{ messId: mess._id }, { active: true }],
    });

    // find allMember in this month
    const userData = await UserMonthData.find({
      $and: [{ messId: user.messId }, { monthId: month._id }],
    })
      .select('userId')
      .sort({ rollNo: 1 });

    const members = await Promise.all(
      userData.map(async (item) => {
        return item.userId;
      })
    );

    const meals = await Promise.all(
      members.map(async (userId) => {
        // find user
        const user = await User.findById(userId).select('name avatar role');

        let userMeals = [];
        if (day && dateFilter) {
          userMeals = await Meal.find({
            $and: [{ userId: userId }, { monthId: month._id }, dateFilter],
          });
        } else {
          userMeals = await Meal.find({
            $and: [{ userId: userId }, { monthId: month._id }],
          });
        }
        let meal = '';
        if (userMeals.length == 0) {
          meal = false;
        } else {
          const userMeal = userMeals[userMeals.length - 1];

          // find user meal

          // create new
          meal = {
            _id: userMeal?._id,
            userId: userId,
            user,
            breakfast: userMeal?.breakfast || 0,
            lunch: userMeal?.lunch || 0,
            dinner: userMeal?.dinner || 0,
            total: userMeal?.total || 0,
            date: userMeal?.date || '',
          };
        }

        return meal;
      })
    );
    if (meals[0] == false) {
      return res.status(200).json({
        status: 'success',
        message: `${moment(day).format(
          'DD/MM/YY'
        )} এই তারিখে কোন মিল যোগ করা হয়নি।`,
        data: {
          data: [],
          total: {},
          date: moment(day),
        },
      });
    }

    // ‍sum by in meals
    const total = {
      total: _.sumBy(meals, 'total'),
      breakfast: _.sumBy(meals, 'breakfast'),
      lunch: _.sumBy(meals, 'lunch'),
      dinner: _.sumBy(meals, 'dinner'),
    };

    res.status(200).json({
      status: 'success',
      data: {
        data: meals,
        total: total,
        date: meals[0].date,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.getMeal = meal.getOne(Meal);
exports.updateMeal = meal.updateOne(Meal, 'meal');
exports.deleteMeal = meal.deleteOne(Meal, 'meal');
