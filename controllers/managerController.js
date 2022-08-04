// node modules
const { default: mongoose } = require('mongoose');

// all Models
const Month = require('../models/monthModel');
const User = require('../models/userModel');
// all Controllers

// all utsils
const AppError = require('../utils/appError');

const Mess = require('../models/messModel');

exports.changeManager = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.userId);
    if (!isValid)
      return next(new AppError(400, 'userId', 'userId is not valid '));
    //  1 chack your mess and alrady exit this user in mess manager
    const mess = await Mess.findOne({
      $and: [{ _id: user.messId }, { manager: req.params.userId }],
    }).select('manager');
    if (mess)
      return next(
        new AppError(
          403,
          'manager',
          'This user is alrady this mess manager, selete another user'
        )
      );
    // update brfore manager role border
    await User.findByIdAndUpdate(mess.manager, { role: 'border' });

    // update mess manager
    await Mess.findByIdAndUpdate(user.messId, { manager: req.params.userId });

    // 2 find user and change this user role manager
    await User.findByIdAndUpdate(req.params.userId, { role: 'manager' });
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
