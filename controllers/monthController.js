// node modules
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Dhaka');
const _ = require('lodash');
const { default: mongoose } = require('mongoose');
const path = require('path');
const schedule = require('node-schedule');

// all Models
const Mess = require('../models/messModel');
const Month = require('../models/monthModel');

// all Controllers

const base = require('./baseController');

// all utils
const AppError = require('../utils/appError');

const {
  createMonth,
  deleteAllMonthData,
  activeMonthAllData,
  getMonthPdf,
  getMessMemberFCMTokens,
  sendReviewNotification,
} = require('../utils/fun');
const UserMonthData = require('../models/userMonthDataModel');
const { monthCal, userMonthCal } = require('../utils/calculation');
const Meal = require('../models/mealModel');
const MonthMemberData = require('../models/monthMemberDataModel');

const createPDF = require('../utils/createPDF');
const User = require('../models/userModel');
const {
  pushNotificationMultiple,
  pushNotification,
} = require('../utils/push-notification');
const Notification = require('../models/notificationsModel');
const AutoMealUpdate = require('../models/autoMealUpdateModel');

exports.createMonth = async (req, res, next) => {
  try {
    const { user } = req;
    let monthName = req.body.monthName;
    const date = moment().month(monthName).startOf('month');

    if (!monthName || !date)
      return next(
        new AppError(402, 'monthName', `আপনার মাসের নাম নির্বাচন করুন`)
      );
    monthName = moment(date).format('MMMM YYYY');

    // 1. find active Month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    if (activeMonth) {
      return next(
        new AppError(
          400,
          'month',
          'আপনার সক্রিয় মাস আছে। আগে সক্রিয় মাসটি নিষ্ক্রিয় করুন।'
        )
      );
    }
    // 2. find mess
    const mess = await Mess.findById(user.messId)
      .populate('allMember', '_id rollNo')
      .select('allMember month _id rollNo');

    //  3. create  your active month
    const month = await createMonth(user, mess, monthName, date);
    if (!month) return next(month);
    // Push Notifications with Firebase
    const pushTitle = 'আপনার নতুন মাস তৈরি করা হয়েছে';
    const pushBody = `${monthName} হলো আপনার নতুন মাস `;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   monthId: month._id,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: month.updatedAt,
    // });
    // send response
    res.status(201).json({
      status: 'success',
      message: 'সফলভাবে আপনার নতুন মাস তৈরি করা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

// add fixed Meal
exports.addFixedMeal = async (req, res, next) => {
  try {
    const { user } = req;
    const fixedMeal = req.body?.fixedMeal;
    if (!fixedMeal && fixedMeal === '') {
      return next(new AppError(401, 'fixedMeal', 'ইনপুট সঠিক না'));
    }

    //1. find active month and update fixed meal
    const month = await Month.findOneAndUpdate(
      { $and: [{ messId: user.messId }, { active: true }] },
      { $set: { fixedMeal: req.body.fixedMeal } }
    );
    if (!month)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি')
      );
    // Push Notifications with Firebase
    const pushTitle = 'Fixed মিল ধার্য় করা হয়েছে';
    const pushBody = `${month.monthTitle} এই মাসের Fixed মিল ${req.body.fixedMeal} ধার্য় করা হলো।`;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   monthId: month._id,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: month.updatedAt,
    // });

    res.status(200).json({
      status: 'success',
      message: 'আপনার মাসে Fixed মিল সফলভাবে যোগ করা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

// auto meal update on of
exports.autoMealUpdate = async (req, res, next) => {
  try {
    const { user } = req;
    const autoMealUpdate = req.body.autoMealUpdate;

    //1. find active month and update fixed meal
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!month)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি')
      );
    month.autoMealUpdate = autoMealUpdate;
    await month.save();

    // Push Notifications with Firebase

    let pushTitle, pushBody, message;
    //  mess

    if (autoMealUpdate == true) {
      const date = moment().add(1, 'days');
      const isMonthDate = moment(month.date).isSame(date, 'month');

      //create meal to after day
      if (isMonthDate) {
        const oldMeals = await Meal.find({
          $and: [
            { monthId: month?._id },
            {
              date: {
                $gte: moment(date).startOf('day'),
                $lte: moment(date).endOf('day'),
              },
            },
          ],
        });

        // if no add next day meal
        if (oldMeals?.length > 0) {
          console.log('Old meal is found so not new add this day meal');
        } else {
          // add all member after day meal
          const mess = await Mess.findById(user.messId).select('allMember');
          if (month) {
            const members = mess?.allMember;
            // all Member meals add in next day
            members.map(async (userId) => {
              // users Meals
              const userMeals = await Meal.find({
                $and: [{ userId: userId }, { monthId: month?._id }],
              });
              const lastDayMeal = userMeals[userMeals?.length - 1];
              const userMeal = lastDayMeal;
              // create new
              const meal = await Meal.create({
                userId: userId,
                breakfast: userMeal?.breakfast || 0,
                lunch: userMeal?.lunch || 0,
                dinner: userMeal?.dinner || 0,
                total: userMeal?.total || 0,
                date: date,
                messId: userMeal?.messId,
                monthId: month?._id,
                addBy: month?.manager,
              });

              // test push notification
              const pushTitle = `মিল যোগ করা হয়েছে`;
              const body = `মোট মিল: ${meal?.total}টি , তারিখ: ${moment(
                meal?.date
              ).format('DD/MM/YY')}`;
              const member = await User.findById(userId).select('FCMToken');
              if (member && member?.FCMToken) {
                const FCMToken = member?.FCMToken;
                await pushNotification(pushTitle, body, FCMToken);
              }
            });
          }
        }
        // auto meal update
        const autoMealUpdate = await AutoMealUpdate.findOne({
          $and: [{ messId: user?.messId }, { monthId: month?._id }],
        });
        if (autoMealUpdate) {
          const autoMealUpdateObject = {
            breakfast: true,
            lunch: false,
            dinner: false,
            tomorrow: false,
            date: moment().format(),
          };

          const upDoc = await AutoMealUpdate.findByIdAndUpdate(
            autoMealUpdate?._id,
            autoMealUpdateObject,
            {
              new: true,
              runValidators: true,
            }
          );

          console.log('auto meal update cron');
        }
      }

      // find old auto meal data
      const oldAutoMeal = await AutoMealUpdate.findOne({
        $and: [{ messId: user.messId }, { monthId: month._id }],
      });
      if (oldAutoMeal) {
        (oldAutoMeal.date = moment().format()), await oldAutoMeal.save();
      } else {
        const autoMeal = await AutoMealUpdate.create({
          breakfast: true,
          messId: user.messId,
          monthId: month._id,
          date: moment().format(),
        });
      }

      pushTitle = `নিজের মিল পরিবর্তন অনুমতি দেওয়া হলো`;
      pushBody = `তারিখ: ${moment().format(
        'DD/MM/YYYY'
      )} থেকে আপনি আপনার নিজের মিল নিজে পরিবর্তন করতে পারবেন ।`;
      message = 'সফল ভাবে অটমিল অফশনটি চালু করা হয়েছে।';
    } else {
      await AutoMealUpdate.findOneAndDelete({
        $and: [{ messId: user.messId }, { monthId: month._id }],
      });

      pushTitle = `নিজের মিল পরিবর্তন অনুমতি বন্ধ করা হলো`;
      pushBody = `তারিখ: ${moment().format(
        'DD/MM/YYYY'
      )} থেকে আপনি আপনার নিজের মিল নিজে আর পরিবর্তন করতে পারবেনা ।`;
      message = 'সফল ভাবে অটমিল অফশনটি বন্ধ করা হয়েছে।';
    }

    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   monthId: month._id,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: month.updatedAt,
    // });

    res.status(200).json({
      status: 'success',
      message: message,
    });
  } catch (error) {
    next(error);
  }
};
// add fixed Meal
exports.getAutoMealOption = async (req, res, next) => {
  try {
    const { user } = req;

    //1. find active month and update fixed meal
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!month)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি')
      );

    const today = moment().format();
    const isMonthDate = moment(month.date).isSame(today, 'month');
    let mealAdd = false;
    if (isMonthDate) {
      // find today meal

      const userMeals = await Meal.find({
        $and: [
          { monthId: month._id },
          {
            date: {
              $gte: moment(today).startOf('day'),
              $lte: moment(today).endOf('day'),
            },
          },
        ],
      });

      // meal add true or false
      mealAdd = moment(userMeals[userMeals.length - 1].date).isSameOrBefore(
        today
      );
    }

    res.status(200).json({
      status: 'success',
      message: '',
      mealAdd,
      autoMealUpdate: month?.autoMealUpdate,
    });
  } catch (error) {
    next(error);
  }
};

// exports.getMess = base.getOne(Mess, 'mess', 'admin');
exports.getActiveMonth = async (req, res, next) => {
  try {
    const { user } = req;

    // ** GET mess all member user Id
    // const mess = await Mess.findById(user.messId).select('messName allMember');
    // 1. Get active Month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    })
      .populate('messId manager', 'userId name email phone avatar messName')
      .select('-createdAt -active -updatedAt');

    if (!month) {
      return res.status(200).json({
        status: 'success',
        message: 'আপনার কোনো সক্রিয় মাস নেই',
        data: null,
      });
    }

    if (['manager', 'subManager'].includes(user.role)) {
      await monthCal(month);
      await month.save();
      const userData = await UserMonthData.find({
        $and: [{ messId: user.messId }, { monthId: month._id }],
      })
        .select('userId')
        .sort({ rollNo: 1 });
      userData.map(async (item) => {
        await userMonthCal(item.userId, month);
      });
      // mess.allMember.map(async (userId) => {
      //   await userMonthCal(userId, month);
      // });
      // cal this user month data
    } else {
      await userMonthCal(user._id, month);
    }

    // 2. Get active Month User Month data
    const userMonthData = await UserMonthData.findOne({
      $and: [{ userId: user._id }, { monthId: month._id }],
    }).select('-createdAt -rollNo -updatedAt');
    await userMonthData.save();

    // 2. Get active Month User Month data
    const recentAdded = async () => {
      const data = await MonthMemberData.find({
        $and: [{ userId: user._id }, { monthId: month._id }],
      }).sort({ date: -1 });

      return data.map((item) => {
        return {
          type: item.type,
          date: item.date,
          amount: item.amount,
        };
      });
    };
    const recentData = await recentAdded();
    // 4. Get this user meal
    const userMeals = async () => {
      const data = await Meal.find({
        $and: [{ userId: user._id }, { monthId: month._id }],
      }).sort({ date: -1 });
      return data.map((item) => {
        return {
          breakfast: item.breakfast,
          lunch: item.lunch,
          dinner: item.dinner,
          total: item.total,
          date: item.date,
        };
      });
    };
    const meals = await userMeals();
    const total = {
      total: _.sumBy(meals, 'total'),
      breakfast: _.sumBy(meals, 'breakfast'),
      lunch: _.sumBy(meals, 'lunch'),
      dinner: _.sumBy(meals, 'dinner'),
    };

    // res ....
    res.status(200).json({
      status: 'success',
      data: {
        mess: month.messId,
        month,
        userMonthData,
        recentAdded: recentData,
        meals: {
          title: `ব্যক্তিগত  ${month.monthTitle} মাসের মিলের তালিকা`,
          item: meals,
          total: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMonthChart = async (req, res, next) => {
  try {
    const { user } = req;
    const monthId = req.query.monthId;

    let month;
    if (monthId) {
      const isValid = mongoose.Types.ObjectId.isValid(monthId);
      if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

      month = await Month.findOne({
        $and: [{ messId: user.messId }, { _id: monthId }],
      });
      if (!month)
        return next(new AppError(404, 'month', 'মাসটি খুজে পাওয়া যায়নি।'));
    } else {
      // find active month
      month = await Month.findOne({
        $and: [{ messId: user.messId }, { active: true }],
      });
      if (!month)
        return next(new AppError(404, 'month', 'আপনার কোনো সক্রিয় মাস নেই'));
    }

    /// find user month data

    // get active month all data

    const data = await activeMonthAllData(month, next);
    // const data = await getMonthPdf(month, next);
    if (data) {
      // // send res
      res.status(200).json({
        status: 'success',
        month: data,
      });
    }
  } catch (error) {
    next(error);
  }
};

// delete month is month manager

exports.deleteMonth = async (req, res, next) => {
  try {
    const { user } = req;

    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // 1. check this user this month manager
    const month = await Month.findOne({
      $and: [{ _id: req.params.id }, { manager: user._id }],
    });
    if (!month)
      return next(
        new AppError(403, 'manage', 'আপনি এই মাসের ম্যানেজার নন', 'fail')
      );
    // 2. find all Member and this month in user mess
    const mess = await Mess.findById(user.messId).select('allMember month');
    // 3. delete mess months in this month id
    mess.month.pull(month);
    // find allMember in this month
    const userData = await UserMonthData.find({
      $and: [{ messId: user.messId }, { monthId: month._id }],
    }).select('userId');

    const members = await Promise.all(
      userData.map(async (item) => {
        return item.userId;
      })
    );
    // 4. delete data in this month related
    await deleteAllMonthData(month._id, members);

    // 5. delete month

    await mess.save();
    await month.remove();

    // Push Notifications with Firebase
    const pushTitle = `আপনার ${month.monthTitle} মাসটি মুছেফেলা হয়েছে।`;
    const pushBody = ` ${user.name} আপনার মেসের ${month.monthTitle} মাসটি মুছেফেলেছে।`;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    res.status(200).json({
      status: 'success',
      message: 'সফলভাবে আপনার মাস মুছেফেলা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

exports.getPDF = async (req, res, next) => {
  try {
    // const { user } = req;
    const messId = req.params.messId;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.messId);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    const mess = await Mess.findById(messId);
    if (!messId || !mess)
      return next(new AppError(404, 'mess', 'আপনার কোন মেস নেই'));
    const month = await Month.findOne({
      $and: [{ messId: messId }, { active: true }],
    }).populate('manager messId', 'name avatar messName');

    const data = await getMonthPdf(month, next);
    const getPdf = await createPDF('month', data);
    // const getPdf = await getMonthPdf(month._id);
    if (getPdf) {
      const filePath = path.join(process.cwd(), `monthDetails_watermark.pdf`);
      // sendReviewNotification(messId);
      console.log({ messId });
      res.download(filePath);
    } else {
      res.status(403).json({
        status: 'fail',
        message: 'can not create file',
        getPdf,
      });
    }
  } catch (error) {
    next(error);
  }
};

// every end of month update all month in  active = false
exports.changeMonthStatus = async (req, res, next) => {
  try {
    const { user } = req;
    const { active } = req.body;

    //1. find is mess active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if ((active == 1 || active == true) && activeMonth)
      return next(
        new AppError(403, 'active', 'ইতিমধ্যে অন্য একটি মাস সক্রিয় আছে।')
      );
    if ((active == 1 || active == true) && !activeMonth) {
      const month = await Month.findOneAndUpdate(
        {
          $and: [{ _id: req.params.id }, { messId: user.messId }],
        },
        { active: active }
      ).select('active subManager manager');

      await User.updateMany({ messId: user.messId }, { role: 'border' });

      await User.findByIdAndUpdate(month.manager, { role: 'manager' });

      month?.subManager?.map(async (user) => {
        await User.findByIdAndUpdate(user, { role: 'subManager' });
      });
      // update user role

      return res.status(200).json({
        status: 'success',
        message: 'আপনার মাসটি সফলভাবে সক্রিয় করা হয়েছে৷',
      });
    }
    if (active == 0 || active == false) {
      const adminRole = user.role;
      await Month.updateOne(
        { $and: [{ _id: req.params.id }, { messId: user.messId }] },
        { active: false, autoMealUpdate: false }
      );
      // update user role
      const findSubManager = await User.updateMany(
        {
          $and: [
            { messId: user.messId },
            { $or: [{ role: 'subManager' }, { role: 'manager' }] },
          ],
        },
        { role: 'border' }
      );
      user.role = adminRole;
      await user.save();
      return res.status(200).json({
        status: 'success',
        message: 'আপনার মাসটি সফলভাবে নিষ্ক্রিয় করা হয়েছে৷',
      });
    }
  } catch (error) {
    next(error);
  }
};

////
exports.getMonth = base.getOne(Month, 'month');

// const setTime = moment().set({ hour: 12, minute: 30 });
// const createdAt = '2023-03-20T18:15:46.671Z';
// const isSameOrBefore = moment(createdAt).isSameOrBefore(setTime);
// console.log(isSameOrBefore);
// const getTest = async () => {
//   const mess = await Mess.findOne({
//     $and: [
//       { _id: '645254da0c21328d4233daec' },
//       { allMember: '6455217f8460dc45fd0b8299' },
//     ],
//   });
//   console.log(mess);
// };
// getTest();
