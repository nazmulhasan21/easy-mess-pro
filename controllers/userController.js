const { validationResult, Result } = require('express-validator');
const cloudinary = require('cloudinary').v2;

const User = require('../models/userModel');
const AppError = require('../utils/appError');
const base = require('./baseController');

// user/me

exports.me = async (req, res, next) => {
  try {
    const { user } = req;
    user.months = undefined;
    const nes = await User.findById(user._id).populate('months');

    res.status(200).json({
      status: 'success',
      data: {
        user,
        nes,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { user } = req;
    const { name, institution, address } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }
    // find user and update me
    const updateMe = await User.findByIdAndUpdate(
      user._id,
      {
        $set: { name: name, institution: institution, address: address },
      },
      { new: true, runValidators: true }
    );

    // send res
    res.status(200).json({
      status: 'success',
      data: {
        updateMe,
      },
    });
  } catch (error) {
    next(error);
  }
};

// upload profile

exports.updateAvater = async (req, res, next) => {
  try {
    const { user } = req;
    const { files } = req;
    if (!files)
      return next(
        new AppError(404, 'avater', 'Please upload your profile image')
      );

    cloudinary.uploader.upload(
      files.avater.tempFilePath,
      async (error, result) => {
        user.avater = result.url;
        await user.save();
        console.log(result.url);
        res.status(200).json({
          status: 'success',
          message: 'Your Profile image upload succesfully',
          data: { user },
        });
      }
    );
  } catch (error) {
    next(error);
  }
};

//
exports.logOut = async (req, res, next) => {
  try {
    const { user } = req;

    user.FCMToken = null;
    await user.save();

    res.json({ logout: true, message: 'Successfully Logout!' });
  } catch (error) {
    next(error);
  }
};

exports.deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      active: false,
    });
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// exports.getAllUsers = base.getAll(User);
exports.getUser = base.getOne(User, 'user');
exports.deleteUser = base.deleteOne(User);
