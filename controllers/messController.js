// node modules
const moment = require('moment');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// all Models
const Mess = require('../models/messModel');
const Month = require('../models/monthModel');
const User = require('../models/userModel');

// all Controllers
const base = require('./baseController');

// all utils
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const {
  createUserMonthData,
  deleteUserMonthData,
  deleteAll,
  createMonth,
  getMessMemberFCMTokens,
  findBorderMissingRollNo,
} = require('../utils/fun');
const { pushNotificationMultiple } = require('../utils/push-notification');
const Notification = require('../models/notificationsModel');

// ********** Start Mess Controller *************** //

exports.createMess = async (req, res, next) => {
  try {
    const { body, user } = req;
    // const isValidMessName = body.messNam;
    // if (!isValidMessName)
    //   return next(new AppError(422, 'messName', 'সুন্দর একটি মেস নাম লিখুন'));
    let monthName = req.body.monthName;
    const date = moment().month(monthName).startOf('month');
    // const date = moment().month(monthName).startOf('month')

    if (!monthName || !date)
      return next(
        new AppError(402, 'monthName', `আপনার মাসের নাম নির্বাচন করুন`)
      );
    monthName = moment(date).format('MMMM YYYY');
    // 1. find mess
    const oldMess = await Mess.findById(user.messId);

    if (oldMess) {
      return next(new AppError(400, 'mess', 'আপনার মেস ইতিমধ্যে আছে।'));
    }

    //  2. create  your mess
    const mess = await Mess.create({
      ...body,
      allMember: [user._id],
      manager: user.messId,
      admin: user._id,
    });

    // 3. create your month

    const month = await createMonth(user, mess, monthName, date);
    if (!month) return next(month);

    // 4. set user mess admin
    user.isMessAdmin = true;
    user.messId = mess._id;
    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'সফলভাবে আপনার মেস টি তৈরি হয়েছে।',
      mess,
    });
  } catch (error) {
    next(error);
  }
};

// get Mess
exports.getMess = async (req, res, next) => {
  try {
    const { user } = req;
    const mess = await Mess.findById(user.messId)
      .populate('admin manager allMember month', '')
      .populate();
    mess.totalBorder = mess.allMember.length;
    await mess.save();
    res.status(200).json({
      status: 'success',
      data: {
        mess,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// get month list

exports.getMonthList = async (req, res, next) => {
  try {
    const { user } = req;

    /// status filter
    const active = req.body.active || '';
    const activeFilter = active ? { active } : {};

    // manager filter
    const manager = req.body.manager || '';
    const managerFilter = manager ? { manager } : {};

    // month title filter
    const monthTitle = req.body.monthTitle || '';
    const monthTitleFilter = monthTitle
      ? { monthTitle: { $regex: monthTitle, $options: 'i' } }
      : {};

    // find query
    const findQuery = {
      $and: [
        { messId: user.messId },
        activeFilter,
        managerFilter,
        monthTitleFilter,
      ],
    };
    // 1.
    const features = new APIFeatures(
      Month.find(findQuery)
        .populate('manager', 'name avatar')
        .sort({ active: -1 }),
      req.query
    ).limitFields();

    const monthList = await features.query;
    const results = await Month.countDocuments(findQuery);
    res.status(200).json({
      status: 'success',
      results: results,
      data: {
        data: monthList,
      },
    });
  } catch (error) {
    next(error);
  }
};

// get Mess Member

exports.getAllMember = base.getAll(User);
exports.getMember = base.getOne(User, 'User');

// get Mess member all missing number
exports.getAllMissingRollNo = async (req, res, next) => {
  try {
    const { user } = req;
    const mess = await Mess.findById(user.messId)
      .populate('allMember', 'rollNo')
      .select('allMember rollNo');
    const missingRollNo = findBorderMissingRollNo(mess.allMember);
    res.status(201).json({
      status: 'success',
      message: '',
      data: missingRollNo,
    });
  } catch (error) {
    next(error);
  }
};

// add member in your mess
exports.addMember = async (req, res, next) => {
  try {
    // this is a add Member email and other validation
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(errors);
    }

    const { user } = req;

    // 1. find mess
    const mess = await Mess.findById(user.messId)
      .populate('allMember', 'rollNo')
      .select('allMember');

    // get missingRollNo
    // * get allMember rollNo
    var rollNos = new Array();
    for (let i = 0; i < mess.allMember.length; i++) {
      rollNos.push(mess.allMember[i].rollNo);
    }
    if (rollNos.includes(req.body.rollNo)) {
      return next(
        new AppError(
          402,
          'rollNo',
          `আপনার মেসের সদস্যের মধ্যে ${req.body.rollNo} রোল নং সদস্যটি বিদ্যমান।  উপরে দেখানো নম্বর থেকে যেকোন একটি  রোল নং দিন।`
        )
      );
    }
    // find new User by email;
    const newUser = req.newUser;

    // #### change newUser role
    newUser.role = 'border';
    newUser.rollNo = req.body.rollNo;
    await newUser.save();

    // 2. add user in your mess
    mess.allMember.push(newUser);
    mess.totalBorder = mess.allMember.length;
    await mess.save();

    // Push Notifications with Firebase
    const pushTitle = 'আপনার মেসে সদস্য যোগ হয়েছে।';
    const pushBody = ` ${newUser.name} আপনার মেসের নতুন সদস্য`;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      const send = await pushNotificationMultiple(
        pushTitle,
        pushBody,
        FCMTokens
      );
    }

    // 3. find active month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (month) {
      // 4. create user Month data
      await createUserMonthData(newUser, month, mess._id);
      await month.save();
      await newUser.save();

      // await Notification.create({
      //   messId: user.messId,
      //   monthId: month._id,
      //   user: newUser._id,
      //   title: pushTitle,
      //   description: pushBody,
      //   date: mess.updatedAt,
      // });
    }

    // await Notification.create({
    //   messId: user.messId,
    //   user: newUser._id,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: mess.updatedAt,
    // });

    res.status(201).json({
      status: 'success',
      message: 'সফলভাবে আপনার মেসে সদস্য যোগ হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

// delete member in your mess and delete member data in active month
exports.deleteMember = async (req, res, next) => {
  try {
    const { user } = req;
    const delUserId = req.params.id;
    const isValid = mongoose.Types.ObjectId.isValid(delUserId);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // ## del user if mess admin
    const findUser = await User.findById(delUserId);
    if (findUser.isMessAdmin)
      return next(new AppError(401, 'admin', 'আপনি এডমিন'));

    // ## find  member is active month manager yes or not
    const month = await Month.findOne({
      $and: [{ manager: delUserId }, { active: true }],
    });
    if (month)
      return next(
        new AppError(400, 'manager', 'ব্যাক্তি টি সক্রিয় মাসের ম্যানেজার')
      );

    // 1. find this member in this mess
    const isMessMember = await Mess.findOne({
      allMember: delUserId,
    }).select('allMember');
    if (!isMessMember)
      return next(
        new AppError(404, 'member', 'এই ব্যাক্তি টি এই মেসের সদস্য না')
      );

    // 2. delete member data all mess in active month

    isMessMember.allMember.pull(delUserId);

    // 3. find  active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (activeMonth) {
      // 4. delete delUser active Month data Cash, Meal, Rice in delUser
      await deleteUserMonthData(delUserId, activeMonth);
      await activeMonth.save();
    }
    isMessMember.totalBorder = isMessMember.allMember.length;
    await isMessMember.save();

    // Push Notifications with Firebase
    const pushTitle = `${findUser.name} সদস্য মুছে ফেলা হয়েছে ।`;
    const pushBody = `আপনার মেসের সদস্য ${findUser.name} কে মুছে ফেলা হয়েছে`;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      const send = await pushNotificationMultiple(
        pushTitle,
        pushBody,
        FCMTokens
      );
    }

    // await Notification.create({
    //   messId: user.messId,
    //   user: findUser._id,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: isMessMember.updatedAt,
    // });

    res.status(200).json({
      status: 'success',
      message: 'আপনার মেসের সদস্যকে সফলভাবে মুছে ফেলা হয়েছে',
    });
  } catch (error) {
    next(error);
  }
};

// change mess admin

exports.changeAdmin = async (req, res, next) => {
  try {
    const { user } = req;
    const userId = req.params.id;
    const isValid = mongoose.Types.ObjectId.isValid(userId);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // ** find user in database
    const findUser = await User.findById(userId);
    if (findUser) {
      // // 1. check user mess admin
      // const messAdmin = await Mess.findOne({ admin: user._id }).select('admin');
      // if (!messAdmin)
      //   return next(new AppError(403, 'admin', 'You are not mess admin'));
      // check is user in mass member
      const equal = JSON.stringify(user._id) === JSON.stringify(userId);
      if (equal)
        return next(new AppError(401, 'admin', 'আপনি ইতিমধ্যে একজন অ্যাডমিন'));

      const isMessMember = await Mess.findOne({ allMember: userId });
      if (isMessMember && !equal) {
        isMessMember.admin = userId;
        await isMessMember.save();
      }
      user.isMessAdmin = false;
      await user.save();
      findUser.isMessAdmin = true;
      await findUser.save();
    }
    // Push Notifications with Firebase
    const pushTitle = 'মেস অ্যাডমিন পরিবর্তন করা হয়েছে।';
    const pushBody = ` ${findUser.name} আপনার মেসের নতুন মেস অ্যাডমিন`;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   messId: user.messId,
    //   user: findUser._id,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: isMessMember.updatedAt,
    // });

    res.status(200).json({
      status: 'success',
      message: 'সফলভাবে আপনার মেস অ্যাডমিন পরিবর্তন করা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

// delete mess when user in admin
exports.deleteMess = async (req, res, next) => {
  try {
    const { user } = req;

    // 1. delete all month in mess
    const mess = await Month.deleteMany({ messId: user.messId });

    // 2. delete all in other data in mess
    await deleteAll(user.messId);

    // 3. finally delete your mess
    await Mess.findByIdAndDelete(user.messId);

    // Push Notifications with Firebase
    const pushTitle = 'আপনার মেস ডিলেট করা হয়েছে।';
    const pushBody = ` ${user.name} আপনার মেস নতুন মেস ডিলেট করেছে।`;
    const FCMTokens = await getMessMemberFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    res.status(201).json({
      status: 'success',
      message: 'সফলভাবে আপনার মেসটি মুছে ফেলা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};
