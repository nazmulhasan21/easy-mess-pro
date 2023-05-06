// node modules
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// all Models
const Month = require('../models/monthModel');
const MonthMemberData = require('../models/monthMemberDataModel');

// all utils
const AppError = require('../utils/appError');

const monthMemberData = require('../controllers/getUpdateDeleteController');

const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Dhaka');
const {
  pushNotificationMultiple,
  pushNotification,
} = require('../utils/push-notification');
const User = require('../models/userModel');
const Notification = require('../models/notificationsModel');
const { getMessMemberFCMTokens } = require('../utils/fun');

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
    }).select('_id monthName');
    if (!month)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি')
      );

    const isMonthDate = moment(month.monthName).isSame(
      body?.date || moment(),
      'month'
    );
    if (!isMonthDate)
      return next(
        new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
      );

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
    // Push Notifications with Firebase

    const member = await User.findById(userId).select('name FCMToken');
    const pushTitle = `${member.name} এর ${type} যোগ করা হয়েছে`;
    const pushBody = `${type}=${amount}/= তারিখ:${moment(date).format(
      'DD/MM/YY'
    )}`;
    // const FCMTokens = await getMessMemberFCMTokens(user.messId);
    // if (FCMTokens) {
    //   await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    // }
    // const member = await User.findById(myMeal.userId).select('FCMToken');
    if (member && member.FCMToken) {
      const FCMToken = member.FCMToken;
      await pushNotification(pushTitle, pushBody, FCMToken);
    }
    // await Notification.create({
    //   monthId: month._id,
    //   user: userId,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: doc.createdAt,
    // });

    // 4. save month

    // 5. send res
    res.status(201).json({
      status: 'success',
      message: `সফলভাবে ${doc.type} যোগকরা হয়েছে।`,
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
