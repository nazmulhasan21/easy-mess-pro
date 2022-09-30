// node modules
const moment = require('moment');
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
} = require('../utils/fun');
const UserMonthData = require('../models/userMonthDataModel');
const { monthCal, userMonthCal } = require('../utils/calculation');
const Meal = require('../models/mealModel');
const MonthMemberData = require('../models/monthMemberDataModel');

const createPDF = require('../utils/createPDF');

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
      .populate('allMember', '_id')
      .select('allMember month');

    //  3. create  your active month
    const month = await createMonth(user, mess, monthName, date);
    if (!month == true) return next(month);

    // send response
    res.status(201).json({
      status: 'success',
      message: 'সফলভাবে আপনার মাস তৈরি করা হয়েছে।',
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
    res.status(200).json({
      status: 'success',
      message: 'আপনার মাসে মিল সফলভাবে যোগ করা হয়েছে।',
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
    }).populate('messId manager', 'userId name email phone avatar messName');

    if (!month) {
      return res.status(200).json({
        status: 'success',
        message: 'আপনার কোনো সক্রিয় মাস নেই',
        data: null,
      });
    }

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
    await userMonthCal(user._id, month);

    // 2. Get active Month User Month data
    const userMonthData = await UserMonthData.findOne({
      $and: [{ userId: user._id }, { monthId: month._id }],
    });
    await userMonthData.save();

    // 2. Get active Month User Month data
    const recentAdded = async () => {
      const data = await MonthMemberData.find({
        $and: [{ userId: user._id }, { monthId: month._id }],
      }).sort({ date: -1 });

      return data.map((item) => {
        // let type = '';
        // if ((item.type = 'cash')) {
        //   type = 'টাকা';
        // } else if ((item.type = 'rice')) {
        //   type = 'চাউল';
        // } else if ((item.type = 'guestMeal')) {
        //   type = '';
        // } else if ((item.type = 'extraRice')) {
        //   type = 'অতিরিক্ত চাউল';
        // } else {
        //   type = 'অতিরিক্ত খরচ';
        // }

        return {
          type: item.type,
          date: item.date,
          amount: item.amount,
        };
      });
    };

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
    res.status(200).json({
      status: 'success',
      data: {
        mess: month.messId,
        month,
        userMonthData,
        recentAdded: await recentAdded(),
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
    // find active month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!month)
      return next(new AppError(404, 'month', 'আপনার কোনো সক্রিয় মাস নেই'));
    /// find user month data

    // get active month all data

    const data = await activeMonthAllData(month, next);
    // const data = await getMonthPdf(month, next);
    if (data) {
      data.meals = [];
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

// test
const test = async (month, userId) => {
  const monthMealSum = await Meal.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { messId: new mongoose.Types.ObjectId(month.messId) },
          { userId: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    {
      $group: {
        _id: '$date',
        breakfast: { $sum: '$breakfast' },
        lunch: { $sum: '$lunch' },
        dinner: { $sum: '$dinner' },
        total: { $sum: '$total' },
      },
    },
  ]);
  //  const monthMeal = monthMealSum[0];
  console.log(monthMealSum);
};
const month = {
  _id: '62f896c095de0eabd15aef99',
  messId: '62f896c095de0eabd15aef97',
};
//test(month, '62f8961795de0eabd15aef8c');

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
    }).populate('manager', 'name avatar');

    const data = await getMonthPdf(month, next);
    const getPdf = await createPDF('month', data);
    // const getPdf = await getMonthPdf(month._id);
    if (getPdf) {
      const filePath = path.join(process.cwd(), `monthDetails.pdf`);
      res.download(filePath);
    } else {
      res.status(200).json({
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
      await Month.updateOne(
        { $and: [{ _id: req.params.id }, { messId: user.messId }] },
        { active: true }
      );
      return res.status(200).json({
        status: 'success',
        message: 'আপনার মাসটি সফলভাবে সক্রিয় করা হয়েছে৷',
      });
    }
    if (active == 0 || active == false) {
      await Month.updateOne(
        { $and: [{ _id: req.params.id }, { messId: user.messId }] },
        { active: false }
      );
      return res.status(200).json({
        status: 'success',
        message: 'আপনার মাসটি সফলভাবে নিষ্ক্রিয় করা হয়েছে৷',
      });
    }
  } catch (error) {
    next(error);
  }
};

const endOfMonth = moment().clone().endOf('month').format('DD');

var j = schedule.scheduleJob(
  `00 20 21 */${endOfMonth} * * `,
  async function () {
    await Month.updateMany({ active: false });
    console.log('Your scheduled job at all month in unActive');
    const today = moment().format('YYYY-MM-DD hh:mm:ss');
    console.log(today);
  }
);

exports.getMonth = base.getOne(Month, 'month');

const ffff = async () => {
  const data = await MonthMemberData.find().populate('userId', 'name avatar');
};

// ffff();
// const newDate = new Date('10/01/22');
// console.log(newDate);
// // const dateFormet = moment('eroi').format('DD/MM/YYYY');
let monthName = 'ttt';
const date = moment().month(monthName).startOf('month');

// if (!monthName || !date) {
//   console.log('not select');
// } else {
//   monthName = date;
//   console.log(monthName);
//   // moment.isDate(new Date()); // false
//   console.log(date);
// }

const isMonth = moment('2022-08-31T18:00:00.000Z').format('MMMM YYYY');
console.log(isMonth);
