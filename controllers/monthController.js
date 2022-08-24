// node modules
const moment = require('moment');
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

exports.createMonth = async (req, res, next) => {
  try {
    const { user } = req;
    const { title } = req.body;

    // 1. find active Month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    if (activeMonth) {
      return next(new AppError(400, 'month', 'Your month alrady exit'));
    }
    // 2. find mess
    const mess = await Mess.findById(user.messId)
      .populate('allMember', '_id')
      .select('allMember month');

    //  3. create  your active month
    await createMonth(user, mess, title);

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
    const mess = await Mess.findById(user.messId).select('messName allMember');
    // 1. Get active Month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).populate('manager', 'userId name email phone');
    // .populate('userMonthData');

    await monthCal(month);
    await month.save();

    mess.allMember.map(async (userId) => {
      await userMonthCal(userId, month);
    });
    await userMonthCal(user._id, month);

    // 2. Get active Month User Month data
    const userMonthData = await UserMonthData.findOne({
      $and: [{ userId: user._id }, { monthId: month._id }],
    }).populate('userId', 'name role avatar phone messId isMessAdmin');
    await userMonthData.save();

    res.status(200).json({
      status: 'success',
      data: {
        mess,
        month,
        userMonthData,
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

    // 4. delete data in this month related
    await deleteAllMonthData(month._id, mess.allMember);

    // 5. delete month

    await mess.save();
    await month.remove();
    res.status(200).json({
      status: 'success',
      message: 'Delete Your month successfully',
      mess,
    });
  } catch (error) {
    next(error);
  }
};

// get month list

exports.getMonthList = async (req, res, next) => {
  try {
    const { user } = req;

    // 1.
    const features = new APIFeatures(
      Month.find({ messId: user.messId })
        .populate('manager', 'name avatar')
        .sort({ createdAt: -1 }),
      req.query
    ).paginate();
    const monthList = await features.query;

    res.status(200).json({
      status: 'success',
      results: monthList.length,
      data: {
        data: monthList,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPDF = async (req, res, next) => {
  try {
    const { user } = req;
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
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

    //2. update any one  month status
    const month = await Month.findOneAndUpdate(
      { $and: [{ _id: req.params.id }, { messId: user.messId }] },
      { active: active }
    );
    if (active) {
      if (month.nModified || month.modifiedCount == 1) {
        activeMonth.active = false;
      }
    } else if (!active) {
      if (month.nModified || month.modifiedCount == 1) {
        activeMonth.active = true;
      }
    }
    await activeMonth.save();
    res.status(200).json({
      status: 'success',
      message: 'chang month status successfully',
      data: {
        data: month,
      },
    });
  } catch (error) {
    next(error);
  }
  // console.log(month);
};

const endOfMonth = moment().clone().endOf('month').format('DD');

var j = schedule.scheduleJob(`00 20 21 */${endOfMonth} * * `, function () {
  deActiveMonth();
  console.log('Your scheduled job at all month in unActive');
  const today = moment().format('YYYY-MM-DD hh:mm:ss');
  console.log(today);
});

exports.getMonth = base.getOne(Month, 'month');
