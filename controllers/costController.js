// node modules
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment');
const { validationResult } = require('express-validator');

// all Models
const Mess = require('../models/messModel');
const Month = require('../models/monthModel');
const Cost = require('../models/costModel');

// all Controllers

// all utsils
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const { calculator } = require('../utils/clculation');
// const { createMonth, deleteAllMonthData } = require('../utils/fun');

// get cost one
exports.getCost = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find cost
    const doc = await Cost.findOne({
      $and: [{ _id: req.params.id }, { messId: user.messId }],
    }).populate('addBy editBy monthId', 'name avater role monthTitle');
    if (!doc)
      return next(new AppError(404, 'cost', 'No cost found with that id'));

    // 2. send res
    res.status(200).json({
      status: 'success',
      message: 'Cost found',
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

// get All Cost active month
exports.getCostList = async (req, res, next) => {
  try {
    const { user, query } = req;

    const { startDate, endDate, day, amount } = query;

    // filter
    // 1. filter in date
    let date = {};
    if (startDate || endDate) {
      date = {
        date: {
          $gte: moment(startDate).startOf('day'),
          $lte: moment(endDate).endOf('day'),
        },
      };
    } else if (day) {
      date = {
        date: {
          $gte: moment(day).startOf('day'),
          $lte: moment(day).endOf('day'),
        },
      };
    }

    // 1 filter in amount

    const filteramount = amount
      ? {
          amount: {
            $gte: amount.split('-')[0],
            $lte: amount.split('-')[1],
          },
        }
      : {};
    const type = req.query.type || '';
    const typeFilter = type ? { type } : {};

    // 1. find active month
    const activMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    // 2. get all cost in active month
    const features = new APIFeatures(
      Cost.find({
        $and: [{ monthId: activMonth._id }, date, filteramount, typeFilter],
      }).populate('addBy editBy', 'name avater role'),
      req.query
    )
      .sort()
      .paginate();
    const doc = await features.query;
    // 3. send res
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createCost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }
    const { user } = req;
    const { type, title, amount, date } = req.body;
    // const date = new Date(req.body.date);

    // 1. find active month;
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).select('_id');
    if (!month)
      return next(new AppError(404, 'month', 'Not found your active Month'));

    // 2. add Market Cost
    const cost = await Cost.create({
      messId: user.messId,
      monthId: month._id,
      addBy: user._id,
      type,
      title,
      amount,
      date: date || moment(),
    });

    await month.save();

    // 3. send res
    res.status(201).json({
      status: 'success',
      message: 'add Cost successfully',
      data: {
        cost,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCost = async (req, res, next) => {
  try {
    const { user, body } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. create new cost body in new data
    const newCost = {
      ...body,
      editBy: user._id,
    };
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const cost = await Cost.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });
    // 2. Not found any cost
    if (!cost || !activeMonth)
      return next(new AppError(404, 'cost', 'Do not update this Cost'));

    const doc = await Cost.findByIdAndUpdate(req.params.id, newCost, {
      new: true,
      runValidators: true,
    });

    // 3. send res
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCost = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // 1. found cost and active month and addby user
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const cost = await Cost.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });

    const addBy = JSON.stringify(cost.addBy) === JSON.stringify(user._id);
    // 2. Not found any cost or activ Month or add by user

    if (!cost || !activeMonth || !addBy)
      return next(new AppError(404, 'cost', 'Do not delete this Cost'));

    // 3. delete Cost
    await Cost.findByIdAndDelete(req.params.id);

    //4. delete this cost id in active Month
    activeMonth.costs.pull(cost);

    res.status(200).json({
      status: 'success',
      message: 'Delete Cost successfully',
    });
  } catch (error) {
    next(error);
  }
};
