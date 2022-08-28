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
} = require('../utils/fun');

// ********** Start Mess Controller *************** //

exports.createMess = async (req, res, next) => {
  try {
    const { body, user } = req;
    const isValidMessName = body.messName.match(/^[a-zA-Z0-9. ]+$/);
    if (!isValidMessName)
      return next(
        new AppError(422, 'messName', 'Please inter your valid mess name')
      );

    // 1. find mess
    const oldMess = await Mess.findById(user.messId);

    if (oldMess) {
      return next(new AppError(400, 'mess', 'Your mess already exit'));
    }

    //  2. create  your mess
    const mess = await Mess.create({
      ...body,
      allMember: [user._id],
      manager: user._id,
      admin: user._id,
    });

    // 3. create your month

    await createMonth(user, mess);

    // 4. set user mess admin
    user.isMessAdmin = true;
    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'Create Your mess successfully',
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
        .sort({ createdAt: -1 }),
      req.query
    )
      .limitFields()
      .paginate();
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

// add member in your mess
exports.addMember = async (req, res, next) => {
  try {
    // this is a add Member email and other validation
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      return next(errors);
    }

    const { user } = req;
    // find new User by email;
    const newUser = req.newUser;

    // #### change newUser role
    newUser.role = 'border';
    // 1. find mess
    const mess = await Mess.findById(user.messId).select('allMember');

    // 2. add user in your mess
    mess.allMember.push(newUser);
    await mess.save();

    // 3. find active month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    // 4. create user Month data
    await createUserMonthData(newUser._id, month, mess._id);

    await month.save();
    await newUser.save();

    res.status(201).json({
      status: 'success',
      message: 'Add member in your mess successfully',
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
      return next(new AppError(401, 'admin', 'You are admin'));

    // ## find  member is active month manager yes or not
    const month = await Month.findOne({
      $and: [{ manager: delUserId }, { active: true }],
    });
    if (month)
      return next(
        new AppError(400, 'manager', 'This is a active month manager')
      );

    // 1. find this member in this mess
    const isMessMember = await Mess.findOne({
      allMember: delUserId,
    }).select('allMember');
    if (!isMessMember)
      return next(
        new AppError(404, 'member', 'This user not this mess member')
      );

    // 2. delete member data all mess in active month
    const mess = await Mess.findOne({ allMember: delUserId }).select(
      'allMember'
    );
    mess.allMember.pull(delUserId);

    // 3. find  active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });

    // 4. delete delUser active Month data Cash, Meal, Rice in delUser
    await deleteUserMonthData(delUserId, activeMonth);

    await activeMonth.save();
    await mess.save();

    res.status(200).json({
      status: 'success',
      message: 'Deleted member in your mess successfully',
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
        return next(new AppError(401, 'admin', 'You are allReady admin'));

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
    res.status(200).json({
      status: 'success',
      message: 'Change in your mess Admin successfully',
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

    res.status(201).json({
      status: 'success',
      message: 'Delete your mess successfully',
    });
  } catch (error) {
    next(error);
  }
};
