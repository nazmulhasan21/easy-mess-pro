// node modules
const { default: mongoose } = require('mongoose');

// all Models
const User = require('../models/userModel');
// all Controllers

// all utils
const AppError = require('../utils/appError');

const Mess = require('../models/messModel');
const { getMessMemberFCMTokens } = require('../utils/fun');
const { pushNotificationMultiple } = require('../utils/push-notification');
const Notification = require('../models/notificationsModel');
const Month = require('../models/monthModel');

exports.changeManager = async (req, res, next) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    const isValid = mongoose.Types.ObjectId.isValid(userId);
    if (!isValid)
      return next(new AppError(400, 'userId', 'userId is not valid '));

    // **** // find active month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (month)
      return next(
        new AppError(
          402,
          'আগে সক্রিয় মাস টি নিষ্ক্রিয় করুন, তার পর মেসের ম্যানেজার পরিবর্তন করুন এবং ম্যানেজার কে নতুন একটি মাস তৈরি করতে বলুন।'
        )
      );

    //  1 check your mess and already exit this user in mess manager
    const manager = await Mess.findOne({
      $and: [{ _id: user.messId }, { manager: userId }],
    }).select('manager');
    if (manager)
      return next(
        new AppError(
          403,
          'manager',
          'এই ব্যাক্তি ইতিমধ্যে এই মেস ম্যানেজার, অন্য ব্যাক্তি নির্বাচন করুন'
        )
      );

    const mess = await Mess.findById(user.messId).select('manager');

    // update before manager role border
    const change = await User.findByIdAndUpdate(
      mess.manager,
      {
        role: 'border',
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (change.role == 'border') {
      // 2 find user and change this user role manager
      const newManager = await User.findOneAndUpdate(
        { $and: [{ _id: userId }, { messId: mess._id }] },
        { role: 'manager' }
      );
      // update mess manager
      mess.manager = newManager._id;
      // active month manager change

      // Push Notifications with Firebase
      const pushTitle = 'আপনার মেস ম্যানেজার পরিবর্তন হয়েছে';
      const pushBody = `${newManager.name} কে আপনার মেস ম্যানেজার করা হলো`;
      const FCMTokens = await getMessMemberFCMTokens(user.messId);
      if (FCMTokens) {
        await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
      }

      // await Notification.create({
      //   messId: user.messId,
      //   user: userId,
      //   title: pushTitle,
      //   description: pushBody,
      //   date: month.updatedAt,
      // });

      // send response
      res.status(201).json({
        status: 'success',
        message: 'সফলভাবে আপনার মেস ম্যানেজার পরিবর্তন হয়েছে।',
      });
    } else {
      return next(new AppError(402, 'error', 'অনুগ্রহ করে আবার চেষ্টা করুন।'));
    }
  } catch (error) {
    next(error);
  }
};

// exports.getMonth = base.getOne(Month, 'month');
