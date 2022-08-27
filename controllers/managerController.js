// node modules
const { default: mongoose } = require('mongoose');

// all Models
const User = require('../models/userModel');
// all Controllers

// all utils
const AppError = require('../utils/appError');

const Mess = require('../models/messModel');

exports.changeManager = async (req, res, next) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    const isValid = mongoose.Types.ObjectId.isValid(userId);
    if (!isValid)
      return next(new AppError(400, 'userId', 'userId is not valid '));
    //  1 check your mess and already exit this user in mess manager
    const { manager } = await Mess.findOne({
      $and: [{ _id: user.messId }, { manager: userId }],
    }).select('manager');
    if (manager)
      return next(
        new AppError(
          403,
          'manager',
          'This user is already this mess manager, select another user'
        )
      );
    const mess = await Mess.findById(user.messId).select('manager');
    // update before manager role border
    await User.findByIdAndUpdate(mess.manager, { role: 'border' });

    // update mess manager
    await Mess.findByIdAndUpdate(user.messId, { manager: userId });

    // 2 find user and change this user role manager
    await User.findByIdAndUpdate(userId, { role: 'manager' });
    // send response
    res.status(201).json({
      status: 'success',
      message: 'Change Your mess Manager successfully',
    });
  } catch (error) {
    next(error);
  }
};

// exports.getMonth = base.getOne(Month, 'month');
