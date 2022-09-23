// node modules
const { default: mongoose } = require('mongoose');

// all Models
const Month = require('../models/monthModel');
const User = require('../models/userModel');
// all Controllers

// all utils
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.addSubManager = async (req, res, next) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    const isValid = mongoose.Types.ObjectId.isValid(userId);
    if (!isValid)
      return next(new AppError(400, 'userId', 'userId is not valid '));
    //  1 add  your subManager in your active month
    const { role } = await User.findById(userId);
    if (role == 'manager')
      return next(
        new AppError(403, 'manager', 'ব্যাক্তি টি এই মাসের ম্যানেজার')
      );
    // 2 find user and change this user role
    await User.findByIdAndUpdate(userId, { role: 'subManager' });
    // send response
    res.status(201).json({
      status: 'success',
      message: 'সফলভাবে আপনার সাব ম্যানেজার যোগ করা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

// delete Sub Manager
exports.deleteSubManager = async (req, res, next) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    const isValid = mongoose.Types.ObjectId.isValid(userId);
    if (!isValid)
      return next(new AppError(400, 'userId', 'userId is not valid '));

    // 1 .check user is active month manager
    if (!user.role == 'manager')
      return next(
        new AppError(403, 'manager', 'ব্যাক্তি টি এই মাসের ম্যানেজার নন।')
      );
    const activeMonthManager = await Month.findOne({
      $and: [{ manager: userId }, { active: true }],
    });

    // 2. return this
    if (activeMonthManager)
      return next(
        new AppError(403, 'manager', 'ব্যাক্তি টি এই মাসের ম্যানেজার', 'wrong')
      );

    // 1. find user and update this user role

    await User.findByIdAndUpdate(userId, { role: 'border' });

    res.status(200).json({
      status: 'success',
      message: 'সফলভাবে আপনার সাব ম্যানেজার মুছেফেলা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

// get Manager list

exports.getSubManagerList = async (req, res, next) => {
  try {
    const { user } = req;

    // 1. find user in role manager
    const features = new APIFeatures(
      User.find({
        $and: [{ messId: user.messId }, { role: 'subManager' }],
      }).select('name email phone avatar role'),
      req.query
    );
    const subManagerList = await features.query;

    res.status(200).json({
      status: 'success',
      results: subManagerList.length,
      data: {
        data: subManagerList,
      },
    });
  } catch (error) {
    next(error);
  }
};

// exports.getMonth = base.getOne(Month, 'month');
