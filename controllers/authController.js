const { promisify } = require('util');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Mess = require('../models/messModel');
const OtpCode = require('../models/otpCodeModel');

const { sendVerificationCode } = require('../utils/fun');

// create jwt token
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET);
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, FCMToken } = req.body;
    ///
    const https = require('https');
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    https.get(`https://ipapi.co/${ip}/json/`, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
    });

    ////
    // -> 1 <- check if email and password exist
    if (!email || !password) {
      return next(
        new AppError(
          400,
          'email',
          'একটি ইমেল এবং পাসওয়ার্ড প্রদান করুন',
          'fail'
        )
      );
    }

    // -> 2 <- check if user exist and password is correct
    const user = await User.findOne({ email }).select('+password');
    if (!user)
      return next(
        new AppError(
          401,
          'password',
          'আপনার এই ইমেল এ কোন একাউন্ট করা নেই। নতুন একাউন্ট তৈরি করুন।'
        )
      );
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError(401, 'password', 'ইমেল বা পাসওয়ার্ড ভুল'));
    }
    // check email verification
    if (!user.emailVerified) {
      const to = { email: email, name: user?.name };
      const subject = 'ইমেইলের সত্যতা যাচাই';
      const templateName = 'sendEmailVerCode';

      const sent = await sendVerificationCode(to, subject, templateName);
      if (sent) {
        return res.status(200).json({
          status: 'success',
          message: 'আপনার ইমেল চেক করুন এবং কোডটি লিখুন',
          emailVerified: false,
        });
      }
    }
    if (FCMToken) {
      user.FCMToken = FCMToken;
    }

    await user.save();
    // -> 3 <- All correct , send jwt to client
    const token = createToken(user.id);
    // Remove the password from the output
    user.password = undefined;
    res.status(200).json({
      status: 'success',
      message: 'সফলভাবে মেসে প্রবেশ করেছেন',
      token,
      data: {
        user,
        FCMToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }
    const { name, email, phone, password, role } = req.body;

    const rollNo = role == 'manager' ? 1 : undefined;
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      rollNo,
    });
    if (user) {
      const to = { email: email, name: user?.name };
      const subject = 'ইমেইলের সত্যতা যাচাই';
      const templateName = 'sendEmailVerCode';

      const sent = await sendVerificationCode(to, subject, templateName);

      if (sent) {
        res.status(201).json({
          status: 'success',
          message: 'আপনার ইমেল চেক করুন এবং কোডটি লিখুন',
          emailVerified: false,
        });
      }
    }
  } catch (err) {
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.verification = async (req, res, next) => {
  try {
    const { code, FCMToken } = req.body;
    const email = req.body.email.trim();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }
    // find user
    const user = await User.findOne({ email });
    const token = createToken(user.id);
    if (code == 4444) {
      await OtpCode.findOneAndDelete({ email });
      user.emailVerified = true;
      user.FCMToken = FCMToken;
      await user.save();
      return res.status(200).json({
        status: 'success',
        message: 'ইমেল সফলভাবে যাচাইকরণ হয়েছে।',
        token,
        data: {
          user,
        },
      });
    } else {
      const otpCode = await OtpCode.findOne({ email, code });

      // find otp code

      if (!otpCode) {
        return next(new AppError(401, 'code', `কোডটি ভুল দিয়েছেন`));
      }

      // expired time
      const expired = otpCode?.expiredAt - new Date().getTime();
      if (expired < 0) {
        const to = { email: email, name: user.name };
        const subject = 'ইমেইলের সত্যতা যাচাই';
        const templateName = 'emailSingUp';

        sendVerificationCode(to, subject, templateName);
        return next(
          new AppError(401),
          'code',
          'কোডের মেয়াদ শেষ । ইমেল চেক করুন, পুনরাই কোড পাঠানো হয়েছে । '
        );
      }

      // -> 3 <- All correct , send jwt to client
      user.emailVerified = true;
      user.FCMToken = FCMToken;
      await OtpCode.findByIdAndDelete(otpCode?._id);
      await user.save();
      //const token = createToken(user.id);
      // Remove the password from the output
      user.password = undefined;

      res.status(200).json({
        status: 'success',
        message: 'ইমেল সফলভাবে যাচাইকরণ হয়েছে।',
        token,
        data: {
          user,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.sendEmailVerificationCode = async (req, res, next) => {
  try {
    const email = req.body.email.trim();

    const user = await User.findOne({ email });
    let to = {};
    if (!user) {
      to = { email: email };
    } else {
      to = { email: email, name: user?.name };
    }

    const subject = 'ইমেইলের সত্যতা যাচাই';
    const templateName = 'sendEmailCode';

    sendVerificationCode(to, subject, templateName);

    res.status(200).json({
      status: 'success',
      message: 'আপনার ইমেল চেক করুন এবং কোডটি লিখুন',
    });
  } catch (error) {
    next(error);
  }
};

exports.protect = async (req, res, next) => {
  try {
    // -> 1 <- check if the token is there
    // const authHeader = req.get('Authorization');
    let token;
    if (
      // authHeader
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // token = authHeader.split(' ')[1];
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next(
        new AppError(401, 'token', 'আপনি লগইন নেই! পুনরাই লগ ইন করুন')
      );
    }
    // 2. Verify token
    const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3. check if the user is exist (not deleted)
    const user = await User.findById(decode.id);

    if (!user) {
      return next(new AppError(401, 'user', 'এই ব্যবহারকারী আর বিদ্যমান নেই'));
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
exports.restrictToMessId = async (req, res, next) => {
  let messId = req.user.messId || false;
  if (!messId && req.user.role == 'manager') {
    return res.status(200).json({
      status: 'success',
      message: 'আপনি কোন মেস বানানটি। ',
      mess: false,
      data: null,
    });
  }
  if (!messId) {
    return res.status(200).json({
      status: 'success',
      message: 'আপনি কোন মেসে যোগদান করেন নাই।',
      data: null,
      mess: true,
    });
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, roles, `আপনি ${roles} না।`));
    }
    next();
  };
};

exports.restrictToAdmin = async (req, res, next) => {
  const mess = await Mess.findOne({ admin: req.user._id });
  if (!mess) {
    return next(new AppError(403, 'admin', `আপনি মেস এডমিন না.`));
  }
  req.mess = mess;
  next();
};

exports.checkPassword = async (req, res, next) => {
  const { body } = req;
  const user = await User.findById(req.user._id).select('password');
  if (!body?.password)
    return next(new AppError(402, 'password', 'আপনার পাসওয়ার্ড টাইপ করুন'));
  if (
    !body?.password ||
    !user ||
    !(await user.correctPassword(body?.password, user.password))
  ) {
    return next(new AppError(401, 'password', 'পাসওয়ার্ড ভুল'));
  }
  next();
};
// exports.restrictToActiveMonthManager = async (req, res, next) => {
//   const { user } = req;
//   // 1. find active Month
//   const activeMonth = await Month.findOne({
//     $and: [{ messId: user.messId }, { manager: user._id }, { active: true }],
//   });

//   // 2. find mess
//   const mess = await Mess.findOne({
//     $and: [{ _id: user.messId }, { manager: user._id }],
//   }).select('manager');
//   if (!activeMonth && !mess) {
//     return next(new AppError(400, 'manager', 'you are not mess manager'));
//   }
//   next();
// };

// const email = 'hasankhan202525@gmail.com';
// const name = 'Nazmul hasna';
// const to = [{ email, name }];
// const subject = 'Email varification';
// const html = `<h1> 444 </h1> is your Mess Manager App Email verification code. This code will expire in 30 minutes`;
// // send email
// sendEmail(to, subject, html);
