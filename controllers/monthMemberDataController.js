// node modules
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// all Models
const Month = require('../models/monthModel');
const MonthMemberData = require('../models/monthMemberDataModel');

// all utils
const AppError = require('../utils/appError');

const monthMemberData = require('../controllers/getUpdateDeleteController');

const moment = require('moment');

exports.getMonthMemberData = monthMemberData.getOne(MonthMemberData);
exports.getMonthMemberDataList = monthMemberData.getList(MonthMemberData);
exports.createMonthMemberData = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }
    const { user, body } = req;
    const { userId, amount, type, date } = body;

    const isValid = mongoose.Types.ObjectId.isValid(userId);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find active month;
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).select('_id');
    if (!month)
      return next(new AppError(404, 'month', 'Not found your active Month'));

    // 2. add Market Cost
    const doc = await MonthMemberData.create({
      messId: user.messId,
      monthId: month._id,
      userId,
      addBy: user._id,
      amount,
      type,
      date: date || moment(),
    });

    // 4. save month

    // 5. send res
    res.status(201).json({
      status: 'success',
      message: `Add ${doc.type} successfully`,
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.updateMonthMemberData = monthMemberData.updateOne(
  MonthMemberData,
  'data'
);
exports.deleteMonthMemberData = monthMemberData.deleteOne(
  MonthMemberData,
  'data'
);
