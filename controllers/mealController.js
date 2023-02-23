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
const { pushNotification } = require('../utils/push-notification');
const Notification = require('../models/notificationsModel');

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

      // Push Notifications with Firebase

      const pushTitle = `মিল যোগ করা হয়েছে`;
      const body = `মোট মিল: ${total}টি , তারিখ: ${moment(date).format(
        'DD/MM/YY'
      )}`;
      const member = await User.findById(myMeal.userId).select('FCMToken');
      if (member && member.FCMToken) {
        const FCMToken = member.FCMToken;
        await pushNotification(pushTitle, body, FCMToken);
      }

      // await Notification.create({
      //   monthId: month._id,
      //   receiver: myMeal.userId,
      //   user: myMeal.userId,
      //   title: pushTitle,
      //   description: body,
      //   date: userMeal.createdAt,
      // });
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
        let meal = '';
        if (day && dateFilter) {
          userMeals = await Meal.findOne({
            $and: [{ userId: userId }, { monthId: month._id }, dateFilter],
          });
          console.log(userMeals);
          if (userMeals.length == 0) {
            meal = false;
          } else {
            meal = {
              _id: userMeals?._id,
              userId: userId,
              user,
              breakfast: userMeals?.breakfast,
              lunch: userMeals?.lunch,
              dinner: userMeals?.dinner,
              total: userMeals?.total,
              date: userMeals?.date,
            };
          }
        } else {
          userMeals = await Meal.find({
            $and: [{ userId: userId }, { monthId: month._id }],
          });

          const lastDayMeal = userMeals[userMeals.length - 1];
          const userMeal = lastDayMeal;
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

exports.updateMyMeal = async (req, res, next) => {
  try {
    const { user, body } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!activeMonth)
      return next(new AppError(404, 'month', `কোন সক্রিয় মাস নেই`));

    let newDoc = {};
    const doc = await Model.findOne({
      $and: [
        { _id: req.params.id },
        { monthId: activeMonth._id },
        { userId: user._id },
      ],
    });
    if (!doc) return next(new AppError(404, model, 'এটি আপনার মিল না।'));
    // only add this month date
    const isMonthDate = moment(activeMonth.date).isSame(
      body?.date || doc?.date,
      'month'
    );
    if (!isMonthDate)
      return next(
        new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
      );

    // if update any one meal  run this if function

    const breakfast =
      body?.breakfast == 0 ? 0 : body?.breakfast || doc?.breakfast;
    const lunch = body?.lunch == 0 ? 0 : body?.lunch || doc?.lunch;
    const dinner = body?.dinner == 0 ? 0 : body?.dinner || doc?.dinner;
    const total = breakfast + lunch + dinner;
    newDoc = {
      breakfast,
      lunch,
      dinner,
      total,
      editBy: user._id,
    };

    pushTitle = `${member.name} এর মিল পরিবর্তন করা হয়েছে`;
    pushBody = `মোট মিল=${total}/= তারিখ:${moment(doc.date).format(
      'DD/MM/YY'
    )}`;

    const upDoc = await Model.findByIdAndUpdate(req.params.id, newDoc, {
      new: true,
      runValidators: true,
    });
    // Push Notifications with Firebase

    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   monthId: activeMonth._id,
    //   user: doc.userId,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: doc.updatedAt,
    // });

    // 3. send res
    return res.status(200).json({
      status: 'success',
      message: 'সফল ভাবে পরিবর্তন করা হয়েছে',
      data: {
        upDoc,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMeal = meal.getOne(Meal);
exports.updateMeal = meal.updateOne(Meal, 'meal');
exports.deleteMeal = meal.deleteOne(Meal, 'meal');
