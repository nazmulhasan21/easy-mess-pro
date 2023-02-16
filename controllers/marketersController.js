// node modules
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment');
const { validationResult } = require('express-validator');

// all Models

const Month = require('../models/monthModel');
const Marketer = require('../models/marketersModel');

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

exports.createMarketers = async (req, res, next) => {
  try {
    const { user } = req;
    const { date } = req.body;
    const marketersId = req.body.marketers || [];
    const { createAuto, marketDays } = req.query;
    // 1. find active month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!month)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি।')
      );
    // if crate marketers list auto
    if (createAuto && marketDays) {
      const monthName = moment(month?.date).format('MMM');
      const startDate = moment().month(monthName).startOf('month').format('DD');
      const endOfMonth = moment().month(monthName).endOf('month').format('DD');
      let date = -marketDays;
      for (let i = 1; date < endOfMonth; i++) {
        // create auto marketDate;
        const marketDate = moment(startDate).add((date += marketDays), 'days');

        const isMonthDate = moment(month?.date).isSame(marketDate, 'month');
        if (isMonthDate) {
          //
          // 3. create Marketers list
          const marketers = await Marketer.create({
            messId: user.messId,
            monthId: month._id,
            marketers: [],
            date: marketDate,
          });
        }
      }

      res.status(201).json({
        status: 'success',
        message: 'সফলভাবে বাজারের তালিকা তৈরি করা হয়েছে।',
      });
    } else {
      if (!date) return next(new AppError(402, 'date', 'তারিখ নির্বাচন করুন।'));
      // create marketer list by one

      //2 only add this month date
      const isMonthDate = moment(month?.date).isSame(date, 'month');
      if (!isMonthDate)
        return next(
          new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
        );

      // 3. create Marketers list
      const marketers = await Marketer.create({
        messId: user.messId,
        monthId: month._id,
        marketers: marketersId,
        date: date,
      });

      res.status(201).json({
        status: 'success',
        message: 'সফলভাবে বাজারের তালিকা তৈরি করা হয়েছে।',
        marketers: marketers,
      });
    }

    // const date = new Date(req.body.date);

    // // Push Notifications with Firebase
    // const pushTitle = 'খরচ যোগ করা হয়েছে';
    // const body = `${title}=${amount}/=,তারিখ:${moment(date).format(
    //   'DD/MM/YY'
    // )}`;
    // const FCMTokens = await getMessMemberFCMTokens(user.messId);
    // if (FCMTokens) {
    //   await pushNotificationMultiple(pushTitle, body, FCMTokens);
    // }

    // await Notification.create({
    //   monthId: month._id,
    //   title: pushTitle,
    //   description: body,
    //   date: cost.createdAt,
    // });
    // 3. send res
  } catch (error) {
    next(error);
  }
};

exports.marketerJoin = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const marketers = await Marketer.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });
    // 2. Not found any cost
    if (!marketers || !activeMonth)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারিদের আপডেট করা যাবে না')
      );

    if (marketers.marketers.length == 2)
      return next(
        new AppError(403, 'join', `আগে থেকেই দুইজন বাজারকারি বিদ্যমান আছে।`)
      );
    if (marketers.marketers.find(user._id))
      return next(
        new AppError(402, 'marketers', `আপনি আগে থেকেই এই তালিকায় আছেন।`)
      );
    marketers.marketers.push(user._id);
    await marketers.save();

    const oldMarketer = await Marketer.findOne({
      $and: [{ monthId: activeMonth._id }, { marketers: user._id }],
    });

    const pushTitle = 'বাজার কারী যুক্ত হয়েছেন';
    const pushBody = `${user.name} তারিখ:${moment(marketers.date).format(
      'DD/MM/YY'
    )}  বাজারে যুক্ত হয়েছেন।`;
    //
    if (oldMarketer) {
      oldMarketer.marketers.pull(user._id);
      await oldMarketer.save();

      pushTitle = `বাজার কারী পরিবর্তন হয়েছে।`;
      pushBody = `${user.name} তারিখ:${moment(oldMarketer.date).format(
        'DD/MM/YY'
      )}  থেকে তারিখ:${moment(marketers.date).format(
        'DD/MM/YY'
      )} বাজার পরিবর্তন করেছে।`;
    }

    // Push Notifications with Firebase

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
      message: 'সফল ভাবে আপনি বাজারে যোগদান করেছে।',
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMarketers = async (req, res, next) => {
  try {
    const { user, body } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. create new cost body in new data

    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const marketers = await Marketer.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });
    // 2. Not found any cost
    if (!marketers || !activeMonth)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারিদের আপডেট করা যাবে না')
      );
    // only add this month date
    const isMonthDate = moment(activeMonth.date).isSame(
      body?.date || marketers.date,
      'month'
    );
    if (!isMonthDate)
      return next(
        new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
      );
    const newMarketers = {
      date: body.date,
      marketers: body.marketers,
    };
    const doc = await Marketer.findByIdAndUpdate(req.params.id, newMarketers, {
      new: true,
      runValidators: true,
    });
    // Push Notifications with Firebase
    const pushTitle = 'বাজারকারী পরিবর্তন করা হয়েছে';
    const pushBody = `তারিখ:${moment(marketers.date).format(
      'DD/MM/YY'
    )}  থেকে তারিখ:${moment(newMarketers.date || marketers.date).format(
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

exports.deleteMarketers = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // 1. found cost and active month and addBy user
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const marketers = await Marketer.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });

    // 2. Not found any cost or active Month or add by user

    if (!marketers || !activeMonth)
      return next(new AppError(404, 'marketers', 'এটি ‍ডিলেট করতে পারবেন না।'));

    // 3. delete Cost
    await Marketer.findByIdAndDelete(req.params.id);
    // Push Notifications with Firebase
    const pushTitle = 'বাজারকারীদের ডিলেট করা হয়েছে';
    const pushBody = `,তারিখ:${moment(marketers.date).format(
      'DD/MM/YY'
    )}  ডিলেট করা হলো।`;
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
      message: 'বাজারকারীদের সফল ভাবে ডিলেট হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

// const { createAuto, marketDays } = [];
const monthName = moment().format('MMM');

const startDate = moment().clone().startOf('month');
const endOfMonth = moment().month(monthName).endOf('month').format('DD');
// console.log(endOfMonth);
let marketDays = 3;
let date = -marketDays;
for (let i = 0; date < endOfMonth; i++) {
  console.log(
    moment(startDate)
      .add((date += marketDays), 'days')
      .format('DD')
  );
  // console.log((date += marketDays));
}
