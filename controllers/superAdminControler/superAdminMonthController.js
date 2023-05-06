// node modules
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Dhaka');

// all Models

const Month = require('../../models/monthModel');

// all Controllers

// all utils
const AppError = require('../../utils/appError');
const User = require('../../models/userModel');

const { pushNotificationMultiple } = require('../../utils/push-notification');
const {
  getMessMemberFCMTokens,
  deleteAllMonthData,
} = require('../../utils/fun');
const Mess = require('../../models/messModel');
const UserMonthData = require('../../models/userMonthDataModel');
const { monthCal, userMonthCal } = require('../../utils/calculation');

/// delete Month
//req.params.id = monthId
exports.deleteMonth = async (req, res, next) => {
  try {
    // const { user } = req;

    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // 1. check this user this month manager
    const month = await Month.findById(req.params.id);
    if (!month)
      return next(
        new AppError(403, 'manage', 'মাসটি খুজে পাওয়া যায়নি', 'fail')
      );
    // 2. find all Member and this month in user mess
    const mess = await Mess.findById(month.messId).select('allMember month');
    // 3. delete mess months in this month id
    mess.month.pull(month);
    // find allMember in this month
    const userData = await UserMonthData.find({
      $and: [{ messId: mess._id }, { monthId: month._id }],
    }).select('userId');

    const members = await Promise.all(
      userData.map(async (item) => {
        return item.userId;
      })
    );
    // 4. delete data in this month related
    await deleteAllMonthData(month._id, members);

    // 5. delete month

    await mess.save();
    await month.remove();

    // Push Notifications with Firebase
    const pushTitle = `আপনার ${month.monthName} মাসটি মুছেফেলা হয়েছে।`;
    const pushBody = `আপনার মেসের ${month.monthName} মাসটি মুছেফেলা হয়েছে।`;
    const FCMTokens = await getMessMemberFCMTokens(mess._id);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    res.status(200).json({
      status: 'success',
      message: 'সফলভাবে আপনার মাস মুছেফেলা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

// get active month
/// req.params.id == messId
exports.getActiveMonth = async (req, res, next) => {
  try {
    // const { user } = req;

    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // 1. check this user this month manager

    const month = await Month.findOne({
      $and: [{ messId: req.params.id }, { active: true }],
    })
      .populate('messId manager', 'userId name email phone avatar messName')
      .select('-createdAt -active -updatedAt');

    if (!month) {
      return res.status(200).json({
        status: 'success',
        message: 'আপনার কোনো সক্রিয় মাস নেই',
        data: null,
      });
    }

    await monthCal(month);
    await month.save();
    const userData = await UserMonthData.find({
      $and: [{ messId: req.params.id }, { monthId: month._id }],
    })
      .select('userId')
      .sort({ rollNo: 1 });
    userData.map(async (item) => {
      await userMonthCal(item.userId, month);
    });

    // res ....
    res.status(200).json({
      status: 'success',
      data: {
        mess: month.messId,
        month,
      },
    });
  } catch (error) {
    next(error);
  }
};
