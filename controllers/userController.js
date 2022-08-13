const { validationResult, Result } = require('express-validator');
const cloudinary = require('cloudinary').v2;

const User = require('../models/userModel');
const OtpCode = require('../models/otpCodeModel');
const AppError = require('../utils/appError');
const base = require('./baseController');
const { sendEmail } = require('../utils/sendEmail');
const { createOtpCode, sendVerificationCode } = require('../utils/fun');

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

// user change password

exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }

    const { password, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('password');

    if (!user || !(await user.correctPassword(password, user.password)))
      return next(new AppError(401, 'password', 'Password is wrong'));

    user.password = newPassword;
    await user.save();
    res.status(401).json({
      status: 'success',
      message: 'Change your password successfuly',
    });
  } catch (error) {
    next(error);
  }
};

// user chang email
exports.changeEmail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }
    const { user } = req;

    const { email, code } = req.body;

    const otpCode = await OtpCode.findOne({ email, code });
    if (!otpCode) {
      return next(new AppError(401, 'code', `code is worng`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      const to = { email: email, name: user.name };
      const subject = 'Change Your Email';
      const templeteName = 'sendEmailCode';

      sendVerificationCode(to, subject, templeteName);
      return next(
        new AppError(401),
        'code',
        'code is expired. please chack email sending new code'
      );
    }
    user.email = email;
    await user.save();
    res.status(401).json({
      status: 'success',
      message: 'Change your Email successfuly',
    });
  } catch (error) {
    next(error);
  }
};

exports.sendForgetPasswordVerfiCode = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }

    const { email } = req.body;
    // 1. find user this email
    const user = await User.findOne({ email });
    if (!user)
      return next(new AppError(404, 'email', 'This email user not found.'));
    // 2. send forget password verifiaction code
    const to = { email: user.email, name: user.name };
    const subject = 'Reset Password Verfication Code';
    const templeteName = 'sendEmailCode';

    sendVerificationCode(to, subject, templeteName);

    res.status(200).json({
      status: 'success',
      message: 'Please chack your email and reset your password',
    });
  } catch (error) {
    next(error);
  }
};

exports.emailVerification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    const otpCode = await OtpCode.findOne({ email, code });
    if (!otpCode || !user) {
      return next(new AppError(401, 'code', `code is worng`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      const to = { email: email, name: user.name };
      const subject = 'Reset Password Verfication Code';
      const templeteName = 'sendEmailCode';

      sendVerificationCode(to, subject, templeteName);
      return next(
        new AppError(401),
        'code',
        'code is expired. please chack email sending new code'
      );
    }
    res.status(200).json({
      status: 'success',
      message: 'Email verification successfuly',
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// forget password
exports.restePassword = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const newPassword = req.body.newPassword.trim();
    if (newPassword.length < 8)
      return next(new AppError(401, 'newPassword', 'password min length 8.'));

    const user = await User.findOne({ email });
    const otpCode = await OtpCode.findOne({ email, code });
    if (!otpCode || !user) {
      return next(new AppError(401, 'code', `code is worng`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      const to = { email: email, name: user.name };
      const subject = 'Reset Password Verfication Code';
      const templeteName = 'sendEmailCode';

      sendVerificationCode(to, subject, templeteName);
      return next(
        new AppError(401),
        'code',
        'code is expired. please chack email sending new code'
      );
    }

    user.password = newPassword;
    await user.save();
    res.status(200).json({
      status: 'success',
      message: 'Reset your password successfuly',
    });
  } catch (error) {
    next(error);
  }
};

// user logout
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
// find user in email
exports.getUserByEmail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }

    const { newUser } = req;
    const user = {
      name: newUser.name,
      email: newUser.email,
      avater: newUser.avater,
    };
    res.status(200).json({
      user: user,
    });
  } catch (error) {
    next(error);
  }
};
// exports.getAllUsers = base.getAll(User);
exports.getUser = base.getOne(User, 'user');
exports.deleteUser = base.deleteOne(User);
