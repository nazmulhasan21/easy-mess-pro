const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

const User = require('../models/userModel');
const OtpCode = require('../models/otpCodeModel');
const AppError = require('../utils/appError');
const base = require('./baseController');

const { sendVerificationCode } = require('../utils/fun');
const APIFeatures = require('../utils/apiFeatures');
const Mess = require('../models/messModel');

exports.getAllUser = async (req, res, next) => {
  const users = await User.find()
    .select('name email phone role avatar emailVerified messId createdAt')
    .sort({ createdAt: -1 });
  const totalUser = users.length;
  const mess = await Mess.find()
    .select()
    .populate('admin allMember', 'name email avatar')
    .sort({ createdAt: -1 });
  const totalMess = mess.length;
  res.status(200).json({
    status: 'success',
    data: {
      totalMess,
      totalUser,
      mess,
      users,
    },
  });
};

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
      message: 'আপনার প্রোফাইল সফলভাবে আপডেট করা হয়েছে।',
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
        new AppError(404, 'avatar', 'আপনার প্রোফাইল ইমেজ আপলোড করুন')
      );
    if (files.avatar) {
      cloudinary.uploader.upload(
        files?.avatar?.tempFilePath,
        async (error, result) => {
          user.avatar = result.secure_url;
          await user.save();
          res.status(200).json({
            status: 'success',
            message: 'আপনার প্রোফাইল ছবি সফলভাবে আপলোড করা হয়েছে।',
            data: {
              avatar: user.avatar,
            },
          });
        }
      );
    } else {
      return next(new AppError(404, 'avatar', 'img ফাইল প্রদান করুন'));
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
      return next(new AppError(401, 'password', 'পাসওয়ার্ড ভুল'));

    user.password = newPassword;
    await user.save();
    res.status(401).json({
      status: 'success',
      message: 'আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করুন করা হয়েছে।',
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
      return next(new AppError(401, 'code', `কোড ভুল`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      const to = { email: email, name: user.name };
      const subject = 'আপনার ইমেইল পরিবর্তন করুন';
      const templateName = 'sendEmailCode';

      sendVerificationCode(to, subject, templateName);
      return next(
        new AppError(401),
        'code',
        'কোডের মেয়াদ শেষ । ইমেল চেক করুন, পুনরাই কোড পাঠানো হয়েছে ।'
      );
    }
    user.email = email;
    await user.save();
    res.status(401).json({
      status: 'success',
      message: 'সফলভাবে আপনার ইমেল পরিবর্তন করা হয়েছে।',
    });
  } catch (error) {
    next(error);
  }
};

// user FCM token update
exports.userFCMTokenUpdate = async (req, res, next) => {
  try {
    const { user } = req;
    const { FCMToken } = req.body;
    if (!FCMToken) {
      return next(new AppError(400, 'fcm', 'Please provide FCM token!'));
    }
    const userFCMTokenUpdate = await User.updateOne(
      { _id: user._id },
      { FCMToken }
    );
    return res.json({ message: 'FCM Token update successfully!' });
  } catch (error) {
    next(error);
  }
};

// get mess notification
exports.getNotifications = async (req, res, next) => {
  try {
    const { user, query } = req;

    const { startDate, endDate, day } = query;

    // filter
    // 1. filter in date
    let date = {};
    if (startDate || endDate) {
      date = {
        date: {
          $gte: moment(startDate).startOf('day'),
          $lte: moment(endDate).endOf('day'),
        },
      };
    } else if (day) {
      date = {
        date: {
          $gte: moment(day).startOf('day'),
          $lte: moment(day).endOf('day'),
        },
      };
    }

    const findQuery = {
      $and: [{ messId: user.messId }, date],
    };

    const features = new APIFeatures(
      Notification.find(findQuery).populate('receiver', 'name avatar').sort(),
      req.query
    ).paginate();

    const data = await features.query;
    const results = await Notification.find(findQuery);
    res.status(200).json({
      status: 'success',
      results: results,
      data: data,
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
      return next(
        new AppError(404, 'email', 'এই ইমেল ব্যবহারকারী খুঁজে পাওয়া যায়নি.')
      );
    // 2. send forget password verification code
    const to = { email: user.email, name: user.name };
    const subject = 'পাসওয়ার্ড পরিবর্তন করুন';
    const templateName = 'sendEmailCode';

    sendVerificationCode(to, subject, templateName);

    res.status(200).json({
      status: 'success',
      message: 'আপনার ইমেল চেক করুন এবং আপনার পাসওয়ার্ড পুনরায় সেট করুন',
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
      return next(new AppError(401, 'code', `কোড ভুল`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      const to = { email: email, name: user.name };
      const subject = 'পাসওয়ার্ড পরিবর্তন করুন';
      const templateName = 'sendEmailCode';

      sendVerificationCode(to, subject, templateName);
      return next(
        new AppError(401),
        'code',
        'আপনার ইমেল চেক করুন এবং আপনার পাসওয়ার্ড পুনরায় সেট করুন'
      );
    }
    res.status(200).json({
      status: 'success',
      message: 'ইমেল যাচাইকরণ সফলভাবে করা হয়েছে।',
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
      return next(
        new AppError(
          401,
          'newPassword',
          'পাসওয়ার্ড সর্বনিম্ন ৮ সংখ্যার দিতে হবে।.'
        )
      );

    const user = await User.findOne({ email });
    const otpCode = await OtpCode.findOne({ email, code });
    if (!otpCode || !user) {
      return next(new AppError(401, 'code', `কোড ভুল`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      const to = { email: email, name: user.name };
      const subject = 'পাসওয়ার্ড পরিবর্তন করুন';
      const templateName = 'sendEmailCode';

      sendVerificationCode(to, subject, templateName);
      return next(
        new AppError(401),
        'code',
        'আপনার ইমেল চেক করুন এবং আপনার পাসওয়ার্ড পুনরায় সেট করুন'
      );
    }

    user.password = newPassword;
    await user.save();
    await OtpCode.findByIdAndDelete(otpCode?._id);
    res.status(200).json({
      status: 'success',
      message: 'সফলভাবে আপনার পাসওয়ার্ড পুনরায় সেট করা হয়েছে।',
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
        new AppError(
          401,
          'user',
          'আপনার মেস থেকে লিভ নেন, তারপর আবার চেষ্টা করুন'
        )
      );

    await User.findByIdAndDelete(user._id);
    res.status(204).json({
      status: 'success',
      message: 'আপনার অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে',
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
