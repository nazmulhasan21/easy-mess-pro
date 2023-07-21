const Meal = require('../models/mealModel');
const Month = require('../models/monthModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const meal = require('./getUpdateDeleteController');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Dhaka');
const _ = require('lodash');

// const { getLastDayUserMeal } = require('../utils/fun');
const Mess = require('../models/messModel');
const User = require('../models/userModel');
const UserMonthData = require('../models/userMonthDataModel');
const {
  pushNotification,
  pushNotificationMultiple,
} = require('../utils/push-notification');
const Notification = require('../models/notificationsModel');
const { default: mongoose } = require('mongoose');
const {
  getMessMemberFCMTokens,
  getMessManagerSubFCMTokens,
} = require('../utils/fun');
const { expectCt } = require('helmet');
const AutoMealUpdate = require('../models/autoMealUpdateModel');

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
    );
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
    const date = moment(req?.body?.date).format();

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

exports.addSingleMeal = async (req, res, next) => {
  try {
    const { user } = req;
    const { meal } = req.body;
    const date = moment(req?.body?.date).format();

    if (date == '') {
      return next(new AppError(402, 'date', 'দয়া করে তারিখ নির্বাচন করুন।'));
    }

    //1. find active month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).select('date');
    if (!month)
      return next(new AppError(404, 'month', 'সক্রিয় মাস পাওয়া যায়নি'));
    // only add this month date
    const isMonthDate = moment(month.date).isSame(date, 'month');
    if (!isMonthDate)
      return next(
        new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন।')
      );

    // check add now day meal in active month
    const oldMeal = await Meal.findOne({
      $and: [
        { monthId: month._id },
        { userId: meal.userId },
        {
          date: {
            $gte: moment(date).startOf('day'),
            $lte: moment(date).endOf('day'),
          },
        },
      ],
    }).select('monthId userId date');
    //c

    if (oldMeal)
      return next(
        new AppError(
          403,
          'meal',
          `আগেই ${moment(date).format(
            'DD/MM/YY'
          )} এই তারিখের মিল যোগ করা আছে। অন্যদিনের মিল যোগ করতে তারিখ পরিবর্তন করুন।`
        )
      );

    //  3. find another user meal
    const oldAnotherMeal = await Meal.find({
      $and: [
        { monthId: month._id },
        {
          date: {
            $gte: moment(date).startOf('day'),
            $lte: moment(date).endOf('day'),
          },
        },
      ],
    }).select('monthId date');

    if (oldAnotherMeal.length == 0)
      return next(
        new AppError(
          403,
          'meal',
          `${moment(date).format(
            'DD/MM/YY'
          )} তারিখে অন্য কারো মিল যোগ করা হয়নি। তাই সবার মিল যোগ করতে, সবার মিল এড অপশনে যান।`
        )
      );

    const total = meal.breakfast + meal.lunch + meal.dinner;
    // 4. post daily meal
    const userMeal = await Meal.create({
      userId: meal.userId,
      breakfast: meal.breakfast,
      lunch: meal.lunch,
      dinner: meal.dinner,
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
    const member = await User.findById(meal.userId).select('FCMToken');
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
    const day = req.query.day;

    return res.status(200).json({
      status: 'success',
      message: `অনুগ্রহ করে আমাদের এপপটি আপডেট দিন`,
      data: {
        data: [],
        total: {},
        date: moment(day).format(),
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.getAllBorderLastDayMeal = async (req, res, next) => {
  try {
    const { user } = req;

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

        let userMeals = await Meal.find({
          $and: [{ userId: userId }, { monthId: month._id }],
        });

        const lastDayMeal = userMeals[userMeals.length - 1];
        const userMeal = lastDayMeal;
        // create new meal
        return {
          _id: userMeal?._id,
          userId: userId,
          user,
          breakfast: userMeal?.breakfast || 0,
          lunch: userMeal?.lunch || 0,
          dinner: userMeal?.dinner || 0,
          total: userMeal?.total || 0,
        };
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
exports.getMealBoard = async (req, res, next) => {
  try {
    const { user } = req;
    const day = req.query.day;
    // const day = moment(getDay).format('MM/DD/YYYY');

    return res.status(200).json({
      status: 'success',
      message: `দয়া করে অ্যাপটি আপডেট দিন। নতুন ডিজাইন করা হয়েছে। আশা করি ভালো লাগবে।`,
      meals: [],
      total: {},
      date: moment(day).format(),
    });

    // update app
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
    }).select('date active');

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
        let meal;
        if (day && dateFilter) {
          userMeals = await Meal.findOne({
            $and: [{ userId: userId }, { monthId: month._id }, dateFilter],
          }).select('userId monthId breakfast lunch dinner total date');

          if (userMeals) {
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
          // find today meal

          let dateFilter = {};
          dateFilter = {
            date: {
              $gte: moment().startOf('day'),
              $lte: moment().endOf('day'),
            },
          };

          userMeals = await Meal.findOne({
            $and: [{ userId: userId }, { monthId: month._id }, dateFilter],
          }).select('userId monthId breakfast lunch dinner total date');
          if (!userMeals) {
            const { date } = await Meal.findOne({
              monthId: month._id,
            })
              .select('date')
              .sort({ date: -1 });
            dateFilter = {
              date: {
                $gte: moment(date).startOf('day'),
                $lte: moment(date).endOf('day'),
              },
            };
            userMeals = await Meal.findOne({
              $and: [{ userId: userId }, { monthId: month._id }, dateFilter],
            }).select('userId monthId breakfast lunch dinner total date');
          }

          // create new
          if (userMeals) {
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
        }

        return meal;
      })
    );
    if (meals[0] == undefined) {
      let message;
      const isMonthDate = moment(month.date).isSame(day, 'month');
      if (!isMonthDate) {
        message = `${moment(month.date).format(
          'MMMM YYYY'
        )} এই মাসের যে কোন তারিখ নির্বাচন করুন।`;
      } else {
        message = `${moment(day).format(
          'DD/MM/YYYY'
        )} এই তারিখে কোন মিল যোগ করা হয়নি।`;
      }

      return res.status(200).json({
        status: 'success',
        message: message,
        meals: [],
        total: {},
        date: moment(day).format(),
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
      meals: meals.filter(Boolean),
      total: total,
      date: meals[0].date,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPersonalTodayMeal = async (req, res, next) => {
  try {
    const { user } = req;
    const today = moment().format();

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!activeMonth)
      return next(new AppError(404, 'month', `কোন সক্রিয় মাস নেই`));

    // find today meal
    const userMeal = await Meal.findOne({
      $and: [
        { monthId: activeMonth._id },
        { userId: user._id },
        {
          date: {
            $gte: moment(today).startOf('day'),
            $lte: moment(today).endOf('day'),
          },
        },
      ],
    });

    if (!userMeal)
      return res.status(200).json({
        status: 'success',
        message: `${moment(today).format(
          'DD/MM/YY'
        )} এই তারিখে কোন মিল যোগ করা হয়নি।`,
        date: moment(today),
        todayMeal: userMeal,
      });
    // customize  user object
    const customizeUser = {
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    };
    ///
    const todayMeal = {
      _id: userMeal?._id,
      userId: user._id,
      user: customizeUser,
      breakfast: userMeal?.breakfast,
      lunch: userMeal?.lunch,
      dinner: userMeal?.dinner,
      date: userMeal?.date,
    };

    ///

    res.status(200).json({
      status: 'success',
      todayMeal,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPersonalTomorrowMeal = async (req, res, next) => {
  try {
    const { user } = req;
    const nextDay = moment().add(1, 'days');

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!activeMonth)
      return next(new AppError(404, 'month', `কোন সক্রিয় মাস নেই`));

    // find today meal
    const userMeal = await Meal.findOne({
      $and: [
        { monthId: activeMonth._id },
        { userId: user._id },
        {
          date: {
            $gte: moment(nextDay).startOf('day'),
            $lte: moment(nextDay).endOf('day'),
          },
        },
      ],
    });

    if (!userMeal)
      return res.status(200).json({
        status: 'success',
        message: `${moment(nextDay).format(
          'DD/MM/YY'
        )} এই তারিখে কোন মিল যোগ করা হয়নি।`,
        date: moment(nextDay),
        tomorrowMeal: userMeal,
      });

    // customize  user object
    const customizeUser = {
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    };

    ///
    const tomorrowMeal = {
      _id: userMeal?._id,
      userId: user._id,
      user: customizeUser,
      breakfast: userMeal?.breakfast,
      lunch: userMeal?.lunch,
      dinner: userMeal?.dinner,
      total: userMeal?.total,
      date: userMeal?.date,
    };

    ///

    res.status(200).json({
      status: 'success',
      tomorrowMeal,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAutoMealOnOf = async (req, res, next) => {
  try {
    const { user } = req;

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!activeMonth)
      return next(new AppError(404, 'month', `কোন সক্রিয় মাস নেই`));

    const autoMealOnOf = await AutoMealUpdate.findOne({
      $and: [{ messId: user.messId }, { monthId: activeMonth._id }],
    }).select('breakfast lunch dinner tomorrow date');

    res.status(200).json({
      status: 'success',
      autoMealUpdate: activeMonth.autoMealUpdate,
      autoMealOnOf,
    });
  } catch (error) {
    next(error);
  }
};

exports.autoMealOnOf = async (req, res, next) => {
  try {
    const { user, body } = req;
    const { breakfast, lunch, dinner, tomorrow } = body;

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!activeMonth)
      return next(new AppError(404, 'month', `কোন সক্রিয় মাস নেই`));
    if (!activeMonth.autoMealUpdate) {
      return next(
        new AppError(
          402,
          'autoMeal',
          'আপনাকে আগে অটো মিল অপশটটি চালু করতে হবে।'
        )
      );
    }
    const autoMealUpdate = await AutoMealUpdate.findOne({
      $and: [{ messId: user.messId }, { monthId: activeMonth._id }],
    });

    let updateObj = {},
      pushBody,
      pushTitle,
      message;

    if (breakfast == true) {
      updateObj = {
        ...autoMealUpdate?._doc,
        breakfast: true,
      };
      pushTitle = `রান্নার চাউল দেওয়া হয়েছে।`;
      pushBody = `তারিখ: ${moment().format(
        'DD/MM/YYYY hh:mm'
      )}  সকলের চাউল দেওয়া হয়েছে, মিল বন্ধ বা চালু করতে মেসেজারের সাথে যোগাযোগ করুন।`;
      message = 'সফল ভাবে সকালের মিল পরিবর্তনের অনুমতি বন্ধ করা হলো।';
    } else if (lunch == true) {
      updateObj = {
        ...autoMealUpdate?._doc,
        breakfast: true,
        lunch: true,
      };
      pushTitle = `রান্নার চাউল দেওয়া হয়েছে।`;
      pushBody = `তারিখ: ${moment().format(
        'DD/MM/YYYY hh:mm'
      )}  দুপুরের চাউল দেওয়া হয়েছে, মিল বন্ধ বা চালু করতে মেসেজারের সাথে যোগাযোগ করুন।`;
      message = 'সফল ভাবে দুপুরের মিল পরিবর্তনের অনুমতি বন্ধ করা হলো।';
    } else if (dinner == true) {
      updateObj = {
        ...autoMealUpdate?._doc,
        breakfast: true,
        lunch: true,
        dinner: true,
      };
      pushTitle = `রান্নার চাউল দেওয়া হয়েছে।`;
      pushBody = `তারিখ: ${moment().format(
        'DD/MM/YYYY hh:mm'
      )}  রাতের চাউল দেওয়া হয়েছে, মিল বন্ধ বা চালু করতে মেসেজারের সাথে যোগাযোগ করুন।`;
      message = 'সফল ভাবে রাতের মিল পরিবর্তনের অনুমতি বন্ধ করা হলো।';
    } else if (tomorrow == true) {
      updateObj = {
        ...autoMealUpdate?._doc,
        breakfast: true,
        lunch: true,
        dinner: true,
        tomorrow: true,
      };
      pushTitle = `রান্নার চাউল দেওয়া হয়েছে।`;
      pushBody = `তারিখ: ${moment().format(
        'DD/MM/YYYY hh:mm'
      )}  আগামীকাল সকালের চাউল দেওয়া হয়েছে, মিল বন্ধ বা চালু করতে মেসেজারের সাথে যোগাযোগ করুন।`;
      message = 'সফল ভাবে আগামীকাল সকালের মিল পরিবর্তনের অনুমতি বন্ধ করা হলো।';
    } else {
      updateObj = {
        ...autoMealUpdate?._doc,
        ...body,
      };

      pushTitle = `কিছু সময়ের জন্য মিল চালানোর অনুমতি দেওয়া হলো`;
      pushBody = `ম্যানেজার কিছু সময়ের জন্য  মিল চালানোর অনুমতি দিয়েছে।`;
    }
    /// push notification all border

    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    const upDoc = await AutoMealUpdate.findByIdAndUpdate(
      autoMealUpdate._id,
      updateObj,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: 'success',
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
    const doc = await Meal.findOne({
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

    pushTitle = `${user.name} এর মিল পরিবর্তন করা হয়েছে`;
    pushBody = `মোট মিল=${total}/= তারিখ:${moment(doc.date).format(
      'DD/MM/YYYY'
    )}`;

    const upDoc = await Meal.findByIdAndUpdate(req.params.id, newDoc, {
      new: true,
      runValidators: true,
    });
    // Push Notifications with Firebase

    const FCMTokens = await getMessManagerSubFCMTokens(user.messId);
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
