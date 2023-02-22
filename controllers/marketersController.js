// node modules
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment');
const { validationResult } = require('express-validator');

// all Models

const Month = require('../models/monthModel');
const Marketer = require('../models/marketersModel');
const MarketerExchange = require('../models/marketersExchangeModel');

// all Controllers

// all utils
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const User = require('../models/userModel');
const Notification = require('../models/notificationsModel');
const {
  pushNotificationMultiple,
  pushNotification,
} = require('../utils/push-notification');
const { getMessMemberFCMTokens } = require('../utils/fun');

// get cost one
exports.getMarketers = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find cost
    const doc = await Marketer.findOne({
      $and: [{ _id: req.params.id }, { messId: user.messId }],
    })
      .populate('marketers', 'name avatar role')
      .select('marketer name avatar role date');
    if (!doc)
      return next(
        new AppError(404, 'marketers', 'কোন বাজারকারী  খুজে পাওয়া যায়নি')
      );

    // 2. send res
    res.status(200).json({
      status: 'success',
      message: 'বাজারকারী খুজে পাওয়া গিয়েছে।',
      doc,
    });
  } catch (error) {
    next(error);
  }
};

// get All Marketers list active month
exports.getMarketersList = async (req, res, next) => {
  try {
    const { user, query } = req;

    const { userId, date } = query;

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    // filter some query
    //1. date filter
    const dateFilter = date
      ? {
          date: {
            $gte: moment(date).startOf('day'),
            $lte: moment(date).endOf('day'),
          },
        }
      : {};

    //2. userId filter
    const userIdFilter = userId ? { marketers: userId } : {};
    // find query
    const findQuery = {
      $and: [{ monthId: activeMonth._id }, dateFilter, userIdFilter],
    };
    // 2. get all cost in active month
    const features = new APIFeatures(
      Marketer.find(findQuery)
        .populate('marketers', 'name avatar role')
        .select('monthId date marketers name avatar role')
        .sort({ date: 1 }),
      req.query
    ).paginate();
    const doc = async () => {
      const data = await features.query;
      return data.map((item) => {
        return {
          _id: item._id,
          date: item.date,
          marketers: item.marketers,
        };
      });
    };

    const results = await Marketer.countDocuments(findQuery);
    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      marketers: await doc(),
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
    const { createAuto } = req.query;
    const marketDays = Number(req.query.marketDays) || '';

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
      const startDate = moment().month(monthName).startOf('month');
      const endOfMonth = moment().month(monthName).endOf('month').format('DD');

      for (let i = 0; i < endOfMonth; i += marketDays) {
        const marketDate = moment(startDate).add(i, 'days').format();
        const findOldMarketers = await Marketer.findOne({
          date: {
            $gte: moment(marketDate).startOf('day'),
            $lte: moment(marketDate).endOf('day'),
          },
        });
        if (findOldMarketers) {
          console.log(findOldMarketers);
        } else {
          // 3. create Marketers list
          var marketers = await Marketer.create({
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
        marketers,
      });
    } else {
      // create marketers for one by one..
      if (!date) return next(new AppError(402, 'date', 'তারিখ নির্বাচন করুন।'));
      // create marketer list by one

      //2 only add this month date
      const isMonthDate = moment(month?.date).isSame(date, 'month');
      if (!isMonthDate)
        return next(
          new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
        );
      const findOldMarketers = await Marketer.findOne({
        date: {
          $gte: moment(date).startOf('day'),
          $lte: moment(date).endOf('day'),
        },
      });
      if (findOldMarketers) {
        return next(
          new AppError(
            402,
            'date',
            `আপনার ${moment(date).format(
              'DD/MM/YY'
            )} তারিখে একটি বাজার আছে, অনুগ্রহ  করে নতুন তারিখ নির্বাচন করুন।`
          )
        );
      } else {
        // 3. create Marketers list
        var marketers = await Marketer.create({
          messId: user.messId,
          monthId: month._id,
          marketers: marketersId,
          date: date,
        });
      }

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
        new AppError(404, 'marketers', 'এই বাজারকারীদের আপডেট করা যাবে না')
      );

    if (marketers.marketers.length == 2)
      return next(
        new AppError(403, 'join', `আগে থেকেই দুইজন বাজারকারী বিদ্যমান আছে।`)
      );

    if (marketers.marketers.find((user) => user == user._id))
      return next(
        new AppError(402, 'marketers', `আপনি আগে থেকেই এই তালিকায় আছেন।`)
      );

    marketers.marketers.push(user._id);
    await marketers.save();

    const pushTitle = 'বাজার কারী যুক্ত হয়েছেন';
    const pushBody = `তারিখ:${moment(marketers.date).format('DD/MM/YY')},নাম:${
      user.name
    }  বাজারে যুক্ত হয়েছেন।`;

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

exports.marketerLeave = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const marketers = await Marketer.findOne({
      $and: [
        { _id: req.params.id },
        { monthId: activeMonth._id },
        { marketers: user._id },
      ],
    });
    // 2. Not found any cost
    if (!marketers || !activeMonth)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারি আগে থেকেই লীভ নিয়েছেন।')
      );
    if (marketers.marketers.find((user) => user == user._id)) {
      marketers.marketers.pull(user._id);
      await marketers.save();
    }

    const pushTitle = 'বাজার কারী লীভ নিয়েছেন।';
    const pushBody = ` তারিখ:${moment(marketers.date).format('DD/MM/YY')}নাম: ${
      user.name
    }  বাজার থেকে লীভ গ্রহন করেছেন।`;

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
      message: 'সফল ভাবে আপনি বাজার থেকে লীভ গ্রহন করেছেন।',
    });
  } catch (error) {
    next(error);
  }
};

exports.getMarketerExchangeOffer = async (req, res, next) => {
  try {
    const { user, query } = req;

    const { date } = query;

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    // filter some query
    //1. date filter
    const dateFilter = date
      ? {
          date: {
            $gte: moment(date).startOf('day'),
            $lte: moment(date).endOf('day'),
          },
        }
      : {};

    // find query
    const findQuery = {
      $and: [
        { monthId: activeMonth._id },
        { marketersExchangeReceiver: user._id },
        dateFilter,
      ],
    };
    // 2. get all cost in active month
    const features = new APIFeatures(
      MarketerExchange.find(findQuery)
        .populate('marketersExchangeSender', 'name avatar role')
        .select('monthId date marketersExchangeSender name avatar role')
        .sort({ date: 1 }),
      req.query
    ).paginate();
    const doc = async () => {
      const data = await features.query;
      return data.map((item) => {
        return {
          _id: item._id,
          date: item.date,
          marketersExchangeSender: item.marketersExchangeSender,
          status: item.status,
        };
      });
    };

    const results = await MarketerExchange.countDocuments(findQuery);
    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      marketers: await doc(),
    });
  } catch (error) {
    next(error);
  }
};
exports.getMarketerExchangeSendOffer = async (req, res, next) => {
  try {
    const { user, query } = req;

    const { date } = query;

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    // filter some query
    //1. date filter
    const dateFilter = date
      ? {
          date: {
            $gte: moment(date).startOf('day'),
            $lte: moment(date).endOf('day'),
          },
        }
      : {};

    // find query
    const findQuery = {
      $and: [
        { monthId: activeMonth._id },
        { marketersExchangeSender: user._id },
        dateFilter,
      ],
    };
    // 2. get all cost in active month
    const features = new APIFeatures(
      MarketerExchange.find(findQuery)
        .populate('marketersExchangeReceiver', 'name avatar role')
        .select('monthId date marketersExchangeReceiver name avatar role')
        .sort({ date: 1 }),
      req.query
    ).paginate();
    const doc = async () => {
      const data = await features.query;
      return data.map((item) => {
        return {
          _id: item._id,
          date: item.date,
          marketersExchangeReceiver: item.marketersExchangeReceiver,
          status: item.status,
        };
      });
    };

    const results = await MarketerExchange.countDocuments(findQuery);
    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      marketers: await doc(),
    });
  } catch (error) {
    next(error);
  }
};

// marketer exchange

exports.marketerExchange = async (req, res, next) => {
  try {
    const { user } = req;
    const { exchangeReceiver, date } = req.body;

    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    if (!mongoose.Types.ObjectId.isValid(exchangeReceiver))
      return next(
        new AppError(
          400,
          'exchangeReceiver',
          'আপনার পরিবর্তে যে বাজার করবে তা নির্বাচন করুন।'
        )
      );
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const marketers = await Marketer.findOne({
      $and: [
        { _id: req.params.id },
        { monthId: activeMonth._id },
        { marketers: user._id },
      ],
    });
    // 2. Not found any cost
    if (!marketers || !activeMonth)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারী আগে থেকেই লীভ নিয়েছেন')
      );

    const oldExchangeRequest = await MarketerExchange.findOne({
      $and: [
        { marketersExchangeSender: user._id },
        { marketersExchangeReceiver: exchangeReceiver },
        { date: marketers.date },
      ],
    });
    if (oldExchangeRequest)
      return next(
        new AppError(
          402,
          'marketerExchange',
          `আপনি ইতি মধ্যে অনুরোধ পাঠিয়েছেন।`
        )
      );
    const exchangeRequest = await MarketerExchange.create({
      monthId: activeMonth._id,
      marketerId: marketers._id,
      marketersExchangeSender: user._id,
      marketersExchangeReceiver: exchangeReceiver,
      date: marketers.date,
    });
    const member = await User.findById(exchangeReceiver).select(
      'FCMToken name'
    );
    const pushTitle = 'বাজার এর অনুরোধ পেয়েছেন।';
    const pushBody = `${user.name} এর তারিখ:${moment(marketers.date).format(
      'DD/MM/YY'
    )} এর  বাজার করে দেওয়ার জন্য অনুরোধ পাঠিয়েছেন ।`;

    // Push Notifications with Firebase

    if (member && member.FCMToken) {
      const FCMToken = member.FCMToken;
      await pushNotification(pushTitle, pushBody, FCMToken);
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
      message: 'সফল ভাবে আপনার বাজারে অনুরোধ পাঠানো হয়েছে',
    });
  } catch (error) {
    next(error);
  }
};
exports.marketerExchangeAccept = async (req, res, next) => {
  try {
    const { user } = req;

    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    if (!mongoose.Types.ObjectId.isValid(req.params.exchangeId))
      return next(
        new AppError(
          400,
          'exchangeReceiver',
          'আপনার পরিবর্তে যে বাজার করবে তা নির্বাচন করুন।'
        )
      );
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const myMarkete = await Marketer.findOne({
      $and: [
        { _id: req.params.id },
        { monthId: activeMonth._id },
        { marketers: user._id },
      ],
    });
    const marketerExchange = await MarketerExchange.findById(
      req.params.exchangeId
    );
    // 2. Not found any cost
    if (!myMarkete || !activeMonth || !marketerExchange)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারিদের  পরিবর্তন করা যাবে না')
      );
    // 1. add  sender in my market
    myMarkete.marketers.pull(user._id);
    myMarkete.marketers.push(marketerExchange.marketersExchangeSender);
    await myMarkete.save();

    //2. join sender market
    const senderMarket = await Marketer.findById(marketerExchange.marketerId);
    senderMarket.marketers.pull(marketerExchange.marketersExchangeSender);
    senderMarket.marketers.push(user._id);
    await senderMarket.save();

    marketerExchange.status == true;
    await marketerExchange.save();

    const member = await User.findById(
      marketerExchange.marketersExchangeSender
    ).select('FCMToken name');
    const pushTitle = 'বাজার এর অনুরোধ গ্রহণ করেছে।';
    const pushBody = `${user.name}, আপনার তারিখ:${moment(
      senderMarket.date
    ).format('DD/MM/YY')} এর  বাজার করতে রাজি হয়েছেন। আর আপনাকে ${moment(
      myMarkete.date
    ).format('DD/MM/YY')} দেওয়ার জন্য অনুরোধ পাঠিয়েছেন ।`;

    // Push Notifications with Firebase

    if (member && member.FCMToken) {
      const FCMToken = member.FCMToken;
      await pushNotification(pushTitle, pushBody, FCMToken);
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
      message: 'সফল ভাবে আপনার বাজারে অনুরোধ পাঠানো হয়েছে',
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
      marketers: body.marketers || marketers.marketers,
    };
    const doc = await Marketer.findByIdAndUpdate(req.params.id, newMarketers, {
      new: true,
      runValidators: true,
    });
    // Push Notifications with Firebase
    const pushTitle = 'বাজার পরিবর্তন করা হয়েছে';
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
      message: 'বাজারকারীদের সফল ভাবে পরির্বতন হয়েছে।',
      doc,
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
    }).populate('marketers', 'name');

    // 2. Not found any cost or active Month or add by user

    if (!marketers || !activeMonth)
      return next(new AppError(404, 'marketers', 'এটি ‍ডিলেট করতে পারবেন না।'));

    // 3. delete Cost
    await Marketer.findByIdAndDelete(req.params.id);
    console.log({ marketers });
    // Push Notifications with Firebase
    const pushTitle = 'বাজারকারীদের ডিলেট করা হয়েছে';
    const pushBody = `তারিখ:${moment(marketers.date).format(
      'DD/MM/YY'
    )} বাজারকারীদের  ডিলেট করা হলো।`;
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

// // const { createAuto, marketDays } = [];

// const monthName = moment().format('MMM');
// const startDate = moment().clone().startOf('month');
// const endOfMonth = moment().month(monthName).endOf('month').format('DD');
// // console.log(endOfMonth);
// console.log({ monthName, startDate, endOfMonth });

// for (let i = 0; i < endOfMonth; i += 3) {
//   console.log(moment(startDate).add(i, 'days').format());
//   // console.log((date += marketDays));
// }

// for (let i = 1; i < 28; i += 3) {
//   console.log(i);
// }
