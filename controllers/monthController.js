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
const APIFeatures = require('../utils/apiFeatures');
const {
  createMonth,
  deleteAllMonthData,
  getMonthPdf,
} = require('../utils/fun');
const UserMonthData = require('../models/userMonthDataModel');
const { monthCal, userMonthCal } = require('../utils/calculation');
const Meal = require('../models/mealModel');
const MonthMemberData = require('../models/monthMemberDataModel');
const Cost = require('../models/costModel');

exports.createMonth = async (req, res, next) => {
  try {
    const { user } = req;
    let monthName = req.body.monthName;
    const date = moment().month(monthName).startOf('month');

    if (!monthName || !date)
      return next(
        new AppError(402, 'monthName', `Please Select your month name`)
      );
    monthName = date;

    // 1. find active Month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    if (activeMonth) {
      return next(new AppError(400, 'month', 'Your month already exit'));
    }
    // 2. find mess
    const mess = await Mess.findById(user.messId)
      .populate('allMember', '_id')
      .select('allMember month');

    //  3. create  your active month
    const month = await createMonth(user, mess, monthName);
    if (month == true) return next(month);

    // send response
    res.status(201).json({
      status: 'success',
      message: 'Create Your Month successfully',
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
      return next(new AppError(401, 'fixedMeal', 'input not valeted'));
    }

    //1. find active month and update fixed meal
    const month = await Month.findOneAndUpdate(
      { $and: [{ messId: user.messId }, { active: true }] },
      { $set: { fixedMeal: req.body.fixedMeal } }
    );
    if (!month)
      return next(new AppError(404, 'month', 'Not found your active month'));
    res.status(200).json({
      status: 'success',
      message: 'Add Fixed Meal Your month successfully',
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
    }).populate('messId manager', 'userId name email phone messName');

    if (!month) {
      return res.status(200).json({
        status: 'success',
        message: 'You have not any active month',
        data: null,
      });
    }

    await monthCal(month);
    await month.save();
    const userData = await UserMonthData.find({
      $and: [{ messId: user.messId }, { monthId: month._id }],
    }).select('userId');
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
    const recentAdded = await MonthMemberData.find({
      $and: [{ userId: user._id }, { monthId: month._id }],
    }).sort({ date: -1 });

    // 4. Get this user meal
    const meals = await Meal.find({
      $and: [{ userId: user._id }, { monthId: month._id }],
    }).sort({ date: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        mess: month.messId,
        month,
        userMonthData,
        recentAdded,
        meals,
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
      return next(
        new AppError(404, 'month', 'You have not a any active month')
      );
    /// find user month data
    const allUserMonthData = await UserMonthData.find({
      $and: [{ messId: user.messId }, { monthId: month._id }],
    }).populate('userId', 'name avatar role');

    // month cost
    const allCost = await Cost.find({
      $and: [{ messId: user.messId }, { monthId: month._id }],
    }).sort({ date: -1 });

    // data for cash rice others

    const getCostTypeItem = (type) => {
      return _.filter(allCost, ['type', `${type}`]);
    };
    // cost type
    const bigCost = getCostTypeItem('bigCost');
    const smallCost = getCostTypeItem('smallCost');
    const otherCost = getCostTypeItem('otherCost');
    // sub

    const costSum = (type) => {
      return _.sumBy(type, 'amount');
    };

    // sub cost
    const bigCostSum = costSum(bigCost);
    const smallCostSum = costSum(smallCost);
    const otherCostSum = costSum(otherCost);

    const memberData = async (type, userId) => {
      const memberItem = await MonthMemberData.find({
        $and: [{ monthId: month._id }, { userId: userId }, { type: type }],
      })
        .populate('userId', 'name avatar')
        .sort({ amount: -1 });
      return memberItem.map((item) => {
        return {
          type: item.type,
          amount: item.amount,
          date: item.date,
        };
      });
    };

    const getItem = async (type) => {
      return await Promise.all(
        allUserMonthData.map(async (item, index) => {
          const data = await memberData(type, item.userId._id);
          const total = _.sumBy(data, 'amount');
          if (total > 0) {
            return {
              name: item.userId.name,
              avatar: item.userId.avatar,
              item: data,
              total,
            };
          }
        })
      );
    };
    const cash = await getItem('cash');
    const rice = await getItem('rice');
    const extraRice = await getItem('extraRice');
    const guestMeal = await getItem('guestMeal');
    const extraCost = await getItem('extraCost');
    // sum

    const sum = (type) => {
      return _.sumBy(type, 'total');
    };
    const cashSum = sum(cash);
    const riceSum = sum(rice);
    const extraRiceSum = sum(extraRice);
    const guestMealSum = sum(guestMeal);
    const extraCostSum = sum(extraCost);

    // meals chart

    const mealData = async (userId) => {
      const memberMeal = await Meal.find({
        $and: [{ monthId: month._id }, { userId: userId }],
      })
        .populate('userId', 'name avatar')
        .sort({});
      return memberMeal.map((meal) => {
        return {
          breakfast: meal.breakfast,
          lunch: meal.lunch,
          dinner: meal.dinner,
          total: meal.total,
          date: moment(meal.date).format('DD-MM-YY'),
        };
      });
    };
    const userMeals = await Promise.all(
      allUserMonthData.map(async (item, index) => {
        const data = await mealData(item.userId._id);
        const total = _.sumBy(data, 'total');
        return {
          name: item.userId.name,
          avatar: item.userId.avatar,
          item: data,
          total,
        };
      })
    );

    // // send res
    res.status(200).json({
      status: 'success',
      data: {
        userMeals,
        cost: [
          { title: 'Big Market', data: bigCost, total: bigCostSum },
          { title: 'Small Cost', data: smallCost, total: smallCostSum },
          { title: 'Other Cost', data: otherCost, total: otherCostSum },
        ],
        userData: [
          { title: 'Cash', data: cash, total: cashSum },
          { title: 'Rich', data: rice, total: riceSum },
          { title: 'Extra Rich', data: extraRice, total: extraRiceSum },
          { title: 'Guest Meal Amount', data: guestMeal, total: guestMealSum },
          { title: 'Extra Cost', data: extraCost, total: extraCostSum },
        ],

        allUserMonthData,
      },
    });
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
        new AppError(403, 'manage', 'You are not this month manager', 'fail')
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
      message: 'Delete Your month successfully',
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
      return next(new AppError(404, 'mess', 'You have not any mess'));
    const month = await Month.findOne({
      $and: [{ messId: messId }, { active: true }],
    });

    const getPdf = await getMonthPdf(month._id);
    if (getPdf) {
      const filePath = path.join(process.cwd(), `monthDetails.pdf`);

      res.download(filePath);
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
        new AppError(403, 'active', 'All ready active another month')
      );
    if ((active == 1 || active == true) && !activeMonth) {
      await Month.updateOne(
        { $and: [{ _id: req.params.id }, { messId: user.messId }] },
        { active: true }
      );
      return res.status(200).json({
        status: 'success',
        message: 'Activated your month status successfully',
      });
    }
    if (active == 0 || active == false) {
      await Month.updateOne(
        { $and: [{ _id: req.params.id }, { messId: user.messId }] },
        { active: false }
      );
      return res.status(200).json({
        status: 'success',
        message: 'Deactivated your month status successfully',
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

const ffff = async (req, res, next) => {
  const data = await MonthMemberData.find().populate('userId', 'name avatar');
  const getType = (type) => {
    return _.filter(data, ['type', `${type}`]);
  };
  const cash = getType('cash');
  // console.log(cash);
  let obj = {};
  const mottt = cash.map((item) => {
    console.log(item);
    obj = {
      name: item.userId.name,
      amount: item.amount,
      date: item.date,
    };
    return obj;
  });
  console.log(mottt);
  const sum = (type) => {
    return _.sumBy(type, 'amount');
  };
  const cashSum = sum(cash);
  console.log(cashSum);

  // const userId = await Promise.all(
  //   userMonth.map(async (item, index) => {
  //     console.log(item);
  //     // console.log(item.userId);
  //     // return item.userId;
  //   })
  // );
  // console.log(userId);
  // console.log(userMonth);
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

const isMonth = moment('2022-08-31T18:00:00.000Z').format('DD/MM/YYYY');
// console.log(isMonth);
