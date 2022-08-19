// node modules
const mongoose = require('mongoose');

// all Models
const Month = require('../models/monthModel');

// all utsils
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

const moment = require('moment');
const Cost = require('../models/costModel');

// get cost one

/**
 *
 * @param {ModelName} Model
 * @param {modelNameString} model
 * @returns {object}
 */
exports.getOne = (Model, model) => async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find cost
    const doc = await Model.findOne({
      $and: [{ _id: req.params.id }, { messId: user.messId }],
    }).populate('addBy editBy userId', 'name avater role');
    if (!doc)
      return next(new AppError(404, model, `No ${model} found with that id`));
    doc.userName = undefined;
    // 2. send res
    res.status(200).json({
      status: 'success',
      message: `${model} found`,
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 *
 * @param {ModelName} Model
 * @returns {Array}
 */
// get All Cost active month
exports.getList = (Model) => async (req, res, next) => {
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
    // amount filter

    const filteramount = amount
      ? {
          amount: {
            $gte: amount.split('-')[0],
            $lte: amount.split('-')[1],
          },
        }
      : {};

    // 1. find active month
    const activMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    // 2. get all cost in active month
    const features = new APIFeatures(
      Model.find({
        $and: [{ monthId: activMonth._id }, date, filteramount],
      })
        .populate('addBy editBy userId', 'name avater role')
        .sort({ createdAt: -1 }),
      req.query
    ).paginate();
    const doc = await features.query;
    const results = await Model.countDocuments({
      $and: [{ monthId: activMonth._id }, date, filteramount],
    });

    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      data: {
        data: doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 *
 * @param {ModelName} Model
 * @param {modelNameString} model
 * @returns {object}
 */
exports.createOne = (Model, model) => async (req, res, next) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return next(errors);
    // }
    const { user } = req;
    const { userId, amount, date } = req.body;
    // **** find user
    // const { name } = await User.findById(userId).select('name');
    // 1. find active month;
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).select('_id');
    if (!month)
      return next(new AppError(404, 'month', 'Not found your active Month'));

    // 2. add Market Cost
    const doc = await Model.create({
      messId: user.messId,
      monthId: month._id,
      userId,
      addBy: user._id,
      amount,
      date: date || moment(),
    });
    // 3. push active month cashs or richs
    if (model == 'rich') {
      //calcu month and user
      //  month.richs.push(doc);
    }
    if (model == 'cash') {
      //  month.cashs.push(doc);
    }
    if (model == 'guestMeal') {
      //   month.guestMeals.push(doc);
    }
    // 4. save month
    await month.save();
    // 5. send res
    res.status(201).json({
      status: 'success',
      message: `add ${model} successfully`,
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 *
 * @param {ModelName} Model
 * @param {modelNameString} model
 * @returns {object}
 */

exports.updateOne = (Model, model) => async (req, res, next) => {
  try {
    const { user, body } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. create new cost body in new data
    let newdoc = {
      ...body,
      editBy: user._id,
    };
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).select('cashs richs meals guestMeal');
    const doc = await Model.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });

    // if update any one meal  run this if function
    if (model == 'meal') {
      const breakfast = body?.breakfast || doc.breakfast;
      const lunch = body?.lunch || doc.lunch;
      const dinner = body?.dinner || doc.dinner;
      const total = breakfast + lunch + dinner;
      newdoc = {
        breakfast,
        lunch,
        dinner,
        total,
        editBy: user._id,
      };
    }
    // 2. Not found any cost
    if (!doc || !activeMonth)
      return next(new AppError(404, model, `Do not update this ${model}`));

    const updoc = await Model.findByIdAndUpdate(req.params.id, newdoc, {
      new: true,
      runValidators: true,
    });

    // 3. send res
    res.status(200).json({
      status: 'success',
      data: {
        updoc,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 *
 * @param {ModelName} Model
 * @param {modelNameString} model
 * @returns {Message}
 */
exports.deleteOne = (Model, model) => async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // 1. found cost and active month and addby user
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).select('_id');
    const doc = await Model.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });

    const addBy = JSON.stringify(doc?.addBy) === JSON.stringify(user._id);
    // 2. Not found any cost or activ Month or add by user

    if (!doc || !activeMonth || !addBy)
      return next(new AppError(404, model, `Do not delete this ${model}`));

    // 3. delete Cost
    await Model.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: `Delete ${model} successfully`,
    });
  } catch (error) {
    next(error);
  }
};
