const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

const User = require('../models/userModel');
const OtpCode = require('../models/otpCodeModel');
const AppError = require('../utils/appError');
const base = require('./baseController');

const { sendVerificationCode } = require('../utils/fun');

// user/me

exports.me = async (req, res, next) => {
  try {
    const { user } = req;

    res.status(200).json({
      status: 'success',
      data: {
        user,
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
      message: 'Your Profile update successfully',
      data: {
        updateMe,
      },
    });
  } catch (error) {
    next(error);
  }
};

// upload profile

exports.updateAvatar = async (req, res, next) => {
  try {
    const { user } = req;
    const { files } = req;
    if (!files)
      return next(
        new AppError(404, 'avatar', 'Please upload your profile image')
      );
    if (files.avatar) {
      cloudinary.uploader.upload(
        files?.avatar?.tempFilePath,
        async (error, result) => {
          user.avatar = result.url;
          await user.save();
          res.status(200).json({
            status: 'success',
            message: 'Your Profile image upload successfully',
            data: {
              avatar: result.url,
            },
          });
        }
      );
    } else {
      return next(new AppError(404, 'avatar', 'Please provide any img file'));
    }
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
      message: 'Change your password successfully',
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

    const { code } = req.body;
    const email = req.body.email.trim();

    const otpCode = await OtpCode.findOne({ email, code });
    if (!otpCode) {
      return next(new AppError(401, 'code', `Code is wrong`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      const to = { email: email, name: user.name };
      const subject = 'Change Your Email';
      const templateName = 'sendEmailCode';

      sendVerificationCode(to, subject, templateName);
      return next(
        new AppError(401),
        'code',
        'Code is expired. please check email sending new code'
      );
    }
    user.email = email;
    await user.save();
    res.status(401).json({
      status: 'success',
      message: 'Change your Email successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.sendForgetPasswordVerificationCode = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }

    const email = req.body.email.trim();
    // 1. find user this email
    const user = await User.findOne({ email });
    if (!user)
      return next(new AppError(404, 'email', 'This email user not found.'));
    // 2. send forget password verification code
    const to = { email: user.email, name: user.name };
    const subject = 'Reset Password Verification Code';
    const templateName = 'sendEmailCode';

    sendVerificationCode(to, subject, templateName);

    res.status(200).json({
      status: 'success',
      message: 'Please check your email and reset your password',
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
      return next(new AppError(401, 'code', `code is wrong`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      const to = { email: email, name: user.name };
      const subject = 'Reset Password Verification Code';
      const templateName = 'sendEmailCode';

      sendVerificationCode(to, subject, templateName);
      return next(
        new AppError(401),
        'code',
        'Code is expired. please check email sending new code'
      );
    }
    res.status(200).json({
      status: 'success',
      message: 'Email verification successfully',
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// forget password
exports.resatPassword = async (req, res, next) => {
  try {
    const { code } = req.body;
    const newPassword = req.body.newPassword.trim();
    const email = req.body.email.trim();
    if (newPassword.length < 8)
      return next(new AppError(401, 'newPassword', 'Password min length 8.'));

    const user = await User.findOne({ email });
    const otpCode = await OtpCode.findOne({ email, code });
    if (!otpCode || !user) {
      return next(new AppError(401, 'code', `Code is wrong`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      const to = { email: email, name: user.name };
      const subject = 'Reset Password Verification Code';
      const templateName = 'sendEmailCode';

      sendVerificationCode(to, subject, templateName);
      return next(
        new AppError(401),
        'code',
        'Code is expired. please check email sending new code'
      );
    }

    user.password = newPassword;
    await user.save();
    await OtpCode.findByIdAndDelete(otpCode?._id);
    res.status(200).json({
      status: 'success',
      message: 'Reset your password successfully',
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
    const { user } = req;
    //1. user join any mess
    if (user.messId)
      return next(
        new AppError(401, 'user', 'Please leave your mess. Then try again')
      );

    await User.findByIdAndDelete(user._id);
    res.status(204).json({
      status: 'success',
      message: 'Your account delete successfully',
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
      avatar: newUser.avatar,
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
