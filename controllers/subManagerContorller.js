// node modules
const { default: mongoose } = require('mongoose');

// all Models
const Month = require('../models/monthModel');
const User = require('../models/userModel');
// all Controllers

// all utsils
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.addSubManager = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.userId);
    if (!isValid)
      return next(new AppError(400, 'userId', 'userId is not valid '));
    //  1 add  your subManager in your active month
    // 2 find user and change this user role
    await User.findByIdAndUpdate(req.params.userId, { role: 'subManager' });
    // send response
    res.status(201).json({
      status: 'success',
      message: 'Add Your Sub Manager successfully',
    });
  } catch (error) {
    next(error);
  }
};

// delete Sub Manager
exports.deleteSubManager = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.userId);
    if (!isValid)
      return next(new AppError(400, 'userId', 'userId is not valid '));

    // 1 .chack user is active month manager
    const activeMonthManager = await Month.findOne({
      $and: [{ manager: req.params.userId }, { active: true }],
    });

    // 2. return this
    if (activeMonthManager)
      return next(
        new AppError(403, 'manager', 'This is a active month manager', 'rong')
      );

    // 1. find user and update this user role

    await User.findByIdAndUpdate(req.params.userId, { role: 'border' });

    res.status(200).json({
      status: 'success',
      message: 'Delete Your Sub Manager successfully',
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
      }).select('name email phone avatar'),
      req.query
    )
      .sort()
      .paginate();
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
