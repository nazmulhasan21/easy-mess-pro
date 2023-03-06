// node modules
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment');

// all Models

const Month = require('../../models/monthModel');
const Marketer = require('../../models/marketersModel');
const MarketerExchange = require('../../models/marketersExchangeModel');

// all Controllers

// all utils
const AppError = require('../../utils/appError');
const APIFeatures = require('../../utils/apiFeatures');
const User = require('../../models/userModel');
const Notification = require('../../models/notificationsModel');
const {
  pushNotificationMultiple,
  pushNotification,
} = require('../../utils/push-notification');
const { getMessMemberFCMTokens } = require('../../utils/fun');
// marketer exchange

exports.marketerExchange = async (req, res, next) => {
  try {
    const { user } = req;
    const { exchangeReceiver, exchangeMarketerId } = req.body;

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
    if (!mongoose.Types.ObjectId.isValid(exchangeMarketerId))
      return next(
        new AppError(
          402,
          'marker',
          'যার বাজার আছে শুধু তার সাথেই বাজার পরিবর্তন করতে পারবেন।'
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
        { exchangeMarketerId: exchangeMarketerId },
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
      exchangeMarketerId: exchangeMarketerId,
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
exports.getMarketerExchangeOffer = async (req, res, next) => {
  try {
    const { user, query } = req;

    const { date } = query;

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!activeMonth)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি।')
      );
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
        { status: 'pending' },
        { marketersExchangeReceiver: user._id },
        dateFilter,
      ],
    };
    // 2. get all cost in active month
    const features = new APIFeatures(
      MarketerExchange.find(findQuery)
        .populate(
          'marketersExchangeSender exchangeMarketerId',
          'name avatar role date'
        )
        .select(
          'monthId date marketersExchangeSender exchangeMarketerId name avatar role'
        )
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
          exchangeDate: item.exchangeMarketerId?.date,
          status: item.status,
        };
      });
    };

    const results = await MarketerExchange.countDocuments(findQuery);
    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      exchanger: await doc(),
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
    if (!activeMonth)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি।')
      );
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
        .populate(
          'marketersExchangeReceiver exchangeMarketerId',
          'name avatar role date'
        )
        .select(
          'monthId date status marketersExchangeReceiver exchangeMarketerId name avatar role'
        )
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
          exchangeDate: item.exchangeMarketerId?.date,
          status: item.status,
        };
      });
    };

    const results = await MarketerExchange.countDocuments(findQuery);
    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      exchanger: await doc(),
    });
  } catch (error) {
    next(error);
  }
};
exports.getMarketerExchanger = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find cost
    const doc = await MarketerExchange.findOne({
      $and: [
        { _id: req.params.id },
        {
          $or: [
            { marketersExchangeSender: user._id },
            { marketersExchangeReceiver: user._id },
          ],
        },
      ],
    })
      .populate(
        'marketersExchangeSender marketersExchangeReceiver',
        'name avatar role'
      )
      .select('marketerId exchangeMarketerId date status name avatar role');
    if (!doc)
      return next(
        new AppError(404, 'marketers', 'কোন বাজারকারী  খুজে পাওয়া যায়নি')
      );
    // find marketer info
    const marketers = await Marketer.findById(doc?.marketerId)
      .populate('marketers', 'name avatar role')
      .select('monthId date marketers name avatar role');
    const exchangeMarketers = await Marketer.findById(doc?.exchangeMarketerId)
      .populate('marketers', 'name avatar role')
      .select('monthId date marketers name avatar role');

    // 2. send res
    res.status(200).json({
      status: 'success',
      message: 'বাজারকারী খুজে পাওয়া গিয়েছে।',
      marketExchange: doc,
      marketers,
      exchangeMarketers,
    });
  } catch (error) {
    next(error);
  }
};

exports.marketerExchangeAccept = async (req, res, next) => {
  try {
    const { user } = req;

    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    // if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    if (!isValid)
      return next(
        new AppError(
          400,
          'exchangeReceiver',
          'আপনার পছন্দের অফারটি নির্বাচন কুুরন।'
        )
      );
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    const marketerExchange = await MarketerExchange.findOne({
      $and: [{ _id: req.params.id }, { marketersExchangeReceiver: user._id }],
    });
    // 2. Not found any cost
    if (!activeMonth || !marketerExchange)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারিদের  পরিবর্তন করা যাবে না')
      );

    //2. join sender market
    if (marketerExchange?.status == 'accept')
      return next(new AppError(402, 'accept', 'আপনি আগেই গ্রহন করেছেন'));

    const senderMarket = await Marketer.findById(marketerExchange.marketerId);
    senderMarket.marketers.pull(marketerExchange.marketersExchangeSender);
    senderMarket.marketers.push(user._id);
    await senderMarket.save();

    marketerExchange.status = 'accept';
    await marketerExchange.save();

    const myMarket = await Marketer.findOne({
      $and: [
        { _id: marketerExchange.exchangeMarketerId },
        { monthId: activeMonth._id },
        { marketers: user._id },
      ],
    });
    //
    let pushBody = '';
    if (myMarket) {
      // 1. add  sender in my market
      myMarket.marketers.pull(user._id);
      myMarket.marketers.push(marketerExchange.marketersExchangeSender);
      await myMarket.save();
      pushBody = `${user.name}, আপনার তারিখ:${moment(senderMarket.date).format(
        'DD/MM/YY'
      )} এর  বাজার করতে রাজি হয়েছেন। আর আপনাকে ${moment(myMarket.date).format(
        'DD/MM/YY'
      )} দেওয়ার জন্য অনুরোধ পাঠিয়েছেন ।`;
    } else {
      pushBody = `${user.name}, আপনার তারিখ:${moment(senderMarket.date).format(
        'DD/MM/YY'
      )} এর  বাজার করতে রাজি হয়েছেন।`;
    }

    const member = await User.findById(
      marketerExchange.marketersExchangeSender
    ).select('FCMToken name');
    const pushTitle = 'বাজার এর অনুরোধ গ্রহণ করেছে।';

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
      message: 'সফল ভাবে আপনার বাজারে অফারটি গ্রহণ করা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};
exports.marketerExchangeReject = async (req, res, next) => {
  try {
    const { user } = req;

    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    // if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    if (!isValid)
      return next(
        new AppError(
          400,
          'exchangeReceiver',
          'আপনার পছন্দের অফারটি নির্বাচন কুুরন।'
        )
      );
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    const marketerExchange = await MarketerExchange.findOne({
      $and: [{ _id: req.params.id }, { marketersExchangeReceiver: user._id }],
    });
    // 2. Not found any cost
    if (!activeMonth || !marketerExchange)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারিদের  পরিবর্তন করা যাবে না')
      );

    marketerExchange.status = 'reject';
    await marketerExchange.save();

    const member = await User.findById(
      marketerExchange.marketersExchangeSender
    ).select('FCMToken name');
    const pushTitle = 'বাজার এর অনুরোধ বাতিল করেছে।';
    const pushBody = `${user.name}, আপনার তারিখ:${moment(
      marketerExchange?.senderMarket?.date
    ).format('DD/MM/YY')} এর  বাজার করতে রাজি হয়নি।`;
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
      message: 'সফল ভাবে আপনার বাজারে অফারটি বাতিল করা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteMarketersExchange = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // 1. found cost and active month and addBy user
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const marketersExchange = await MarketerExchange.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });

    // 2. Not found any cost or active Month or add by user

    if (!marketersExchange || !activeMonth)
      return next(new AppError(404, 'exchanger', 'এটি ‍ডিলেট করতে পারবেন না।'));

    if (marketersExchange.status == 'accept')
      return next(new AppError(404, 'exchanger', 'আপনার অফারটি গ্রহন করেছে।'));

    // 3. delete Cost
    await MarketerExchange.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: ' সফল ভাবে ডিলেট হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};
