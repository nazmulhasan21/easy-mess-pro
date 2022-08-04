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

// all utsils
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const { createMonth, deleteAllMonthData } = require('../utils/fun');
const UserMonthData = require('../models/userMonthDataModel');
const { calculator } = require('../utils/clculation');
const createPDF = require('../utils/createPDF');

exports.createMonth = async (req, res, next) => {
  try {
    const { user } = req;

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
    await createMonth(user, mess);

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
    //1. find active month and update fixed meal
    await Month.findOneAndUpdate(
      { $and: [{ messId: user.messId }, { active: true }] },
      { $set: { fixedMeal: req.body.fixedMeal } }
    );

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
    const mess = await Mess.findById(user.messId).select('allMember');

    // 1. Get active Month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).populate('manager userMonthData', 'userId name email phone');
    // .populate('userMonthData');
    const totalMember = month.userMonthData.length;
    month.userMonthData.forEach(async ({ userId }) => {
      calculator(userId, month, totalMember);
    });
    // const totalMember = mess.allMember.length;
    // mess.allMember.forEach(async (userId) => {
    //   calculator(userId, month, totalMember);
    // });

    // 2. Get active Month User Month data
    const userMonthData = await UserMonthData.findOne({
      $and: [{ userId: user._id }, { monthId: month._id }],
    }).populate('userId', 'name role');
    month.userMonthData = undefined;
    res.status(200).json({
      status: 'success',
      data: {
        month,
        userMonthData,
      },
    });
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

    // 1. chack this user this month manager
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

    // 4. delelte data in this month related
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
    let monthList;

    // 1. chack this user admin

    const mess = await Mess.findOne({ admin: user._id }).select('admin');
    if (mess && (user.role == 'manager' || user.role == 'border')) {
      const features = new APIFeatures(
        Month.find({ messId: mess._id }),
        req.query
      )
        .sort()
        .paginate();
      monthList = await features.query;
    }
    // 2 get month list in this user month manager
    if (user.role == 'manager' && !mess) {
      const features = new APIFeatures(
        Month.find({ manager: user._id }),
        req.query
      )
        .sort()
        .paginate();
      // then month list
      monthList = await features.query;
    }

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
    const data = await Month.findOne({
      // _id: '62e61103e1b34fce918db78d',
      $and: [{ messId: user.messId }, { active: true }],
    }).populate('costs meals richs cashs userMonthData manager');
    await createPDF('index', data);

    const filePath = path.join(
      process.cwd(),
      `${data.monthTitle}- ${data.messId}.pdf`
    );
    res.download(filePath);
  } catch (error) {
    next(error);
  }
};

// every end of month update all month in  active = false
const deActiveMonth = async () => {
  const month = await Month.updateMany({}, { active: false });
  // console.log(month);
};

const endOfMonth = moment().clone().endOf('month').format('DD');

var j = schedule.scheduleJob(`00 20 21 */${endOfMonth} * * `, function () {
  deActiveMonth();
  console.log('Your scheduled job at all month in unactive');
  const today = moment().format('YYYY-MM-DD hh:mm:ss');
  console.log(today);
});

exports.getMonth = base.getOne(Month, 'month');
