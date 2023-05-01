// node modules
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment');
const { validationResult } = require('express-validator');

// all Models

const Month = require('../models/monthModel');
const Cost = require('../models/costModel');

// all Controllers

// all utils
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const User = require('../models/userModel');
const Notification = require('../models/notificationsModel');
const { pushNotificationMultiple } = require('../utils/push-notification');
const { getMessMemberFCMTokens } = require('../utils/fun');

// get cost one
exports.getCost = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find cost
    const doc = await Cost.findOne({
      $and: [{ _id: req.params.id }, { messId: user.messId }],
    }).populate('addBy editBy monthId', 'name avatar role monthTitle');
    if (!doc)
      return next(new AppError(404, 'cost', 'কোন খরচ খুজে পাওয়া যায়নি'));

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

    const filterAmount = amount
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
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    // find query
    const findQuery = {
      $and: [{ monthId: activeMonth._id }, date, filterAmount, typeFilter],
    };
    // 2. get all cost in active month
    const features = new APIFeatures(
      Cost.find(findQuery)
        .populate('addBy editBy', 'name avatar role')
        .select('type title amount addBy editBy date createdAt updatedAt')
        .sort({ createdAt: -1 }),
      req.query
    ).paginate();
    const doc = async () => {
      const data = await features.query;
      return data.map((item) => {
        return {
          _id: item._id,
          type: item.type,
          title: item.title,
          amount: item.amount,
          addBy: item.addBy,
          editBy: item.editBy,
          date: item.date,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });
    };
    const results = await Cost.countDocuments(findQuery);
    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      data: {
        data: await doc(),
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
    }).select('_id date');
    if (!month)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি।')
      );
    // only add this month date
    const isMonthDate = moment(month?.date).isSame(date, 'month');
    if (!isMonthDate)
      return next(
        new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
      );
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
    // Start Push Notification

    // Push Notifications with Firebase
    const pushTitle = 'খরচ যোগ করা হয়েছে';
    const body = `${title}=${amount}/=,তারিখ:${moment(date).format(
      'DD/MM/YY'
    )}`;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, body, FCMTokens);
    }

    // await Notification.create({
    //   monthId: month._id,
    //   title: pushTitle,
    //   description: body,
    //   date: cost.createdAt,
    // });
    // 3. send res
    res.status(201).json({
      status: 'success',
      message: 'সফলভাবে খরচ যোগ করা হয়েছে।',
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
      return next(new AppError(404, 'cost', 'এই খরচ  আপডেট করা যাবে না'));
    // only add this month date
    const isMonthDate = moment(activeMonth.date).isSame(
      body?.date || cost.date,
      'month'
    );
    if (!isMonthDate)
      return next(
        new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
      );
    const doc = await Cost.findByIdAndUpdate(req.params.id, newCost, {
      new: true,
      runValidators: true,
    });
    // Push Notifications with Firebase
    const pushTitle = 'খরচ পরিবর্তন করা হয়েছে';
    const pushBody = `${cost.title}=${cost.amount}/=,তারিখ:${moment(
      cost.date
    ).format('DD/MM/YY')}  থেকে ${newCost.title || cost.title}=${
      newCost.amount || cost.amount
    }/=,তারিখ:${moment(newCost.date || cost.date).format(
      'DD/MM/YY'
    )} পরিবর্তন করা হলো।`;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   monthId: cost.messId,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: cost.updatedAt,
    // });
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

    // 1. found cost and active month and addBy user
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const cost = await Cost.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });

    const addBy = JSON.stringify(cost.addBy) === JSON.stringify(user._id);
    // 2. Not found any cost or active Month or add by user

    if (!cost || !activeMonth || !addBy)
      return next(
        new AppError(
          404,
          'cost',
          'আপনি যে খরচ এড করেছেন শুধু মাত্র সেই খরচ ‍ডিলেট করতে পারবেন'
        )
      );

    // 3. delete Cost
    await Cost.findByIdAndDelete(req.params.id);
    // Push Notifications with Firebase
    const pushTitle = 'খরচ ডিলেট করা হয়েছে';
    const pushBody = `${cost.title}=${cost.amount}/=,তারিখ:${moment(
      cost.date
    ).format('DD/MM/YY')}  ডিলেট করা হলো।`;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   monthId: cost.messId,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: cost.updatedAt,
    // });
    res.status(200).json({
      status: 'success',
      message: 'খরচ টি সফল ভাবে ডিলেট হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};
