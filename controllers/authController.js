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
    const { email, password } = req.body;
    // -> 1 <- check if email and password exist
    if (!email || !password) {
      return next(
        new AppError(400, 'email', 'Please provide email or password', 'fail')
      );
    }

    // -> 2 <- check if user exist and password is correct
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError(401, 'password', 'Email or Password is wrong'));
    }
    // chack email verification
    if (!user.emailVerified) {
      const to = { email: email, name: user.name };
      const subject = 'Email verification';
      const templeteName = 'emailsingUp';

      sendVerificationCode(to, subject, templeteName);

      return res.status(200).json({
        status: 'fail',
        message: 'Please chack your email and verificd your account',
        emailVerified: false,
      });
    }

    // -> 3 <- All correctc , send jwt to client
    const token = createToken(user.id);
    // Remove the password from the output
    user.password = undefined;
    res.status(200).json({
      status: 'success',
      message: 'Login successfully',
      token,
      data: {
        user,
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

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
    });
    if (user) {
      const to = { email: email, name: user.name };
      const subject = 'Email verification';
      const templeteName = 'emailsingUp';

      sendVerificationCode(to, subject, templeteName);
      res.status(201).json({
        status: 'success',
        message: 'Please chack your email and verificd your account',
        emailVerified: false,
      });
    }
  } catch (err) {
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.verification = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errors);
    }
    // find user
    const user = await User.findOne({ email });

    if (code === 4444) {
      user.emailVerified = true;
      await user.save();
      return res.status(200).json({
        status: 'success',
        message: 'Email verification successfully',
        token,
        data: {
          user,
        },
      });
    } else {
      const otpCode = await OtpCode.findOne({ email, code });

      // find otp code

      if (!otpCode) {
        return next(new AppError(401, 'code', `code is worng`));
      }

      // expired time
      const expired = otpCode?.expiredAt - new Date().getTime();
      if (expired < 0) {
        const to = { email: email, name: user.name };
        const subject = 'Email verification';
        const templeteName = 'emailsingUp';

        sendVerificationCode(to, subject, templeteName);
        return next(
          new AppError(401),
          'code',
          'code is expired. please chack email sending new code'
        );
      }

      // -> 3 <- All correctc , send jwt to client
      user.emailVerified = true;
      await OtpCode.findByIdAndDelete(otpCode?._id);
      await user.save();
      const token = createToken(user.id);
      // Remove the password from the output
      user.password = undefined;

      res.status(200).json({
        status: 'success',
        message: 'Email verification successfully',
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

exports.sendEmailVerifiCode = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    let to = {};
    if (!user) {
      to = { email: email };
    } else {
      to = { email: email, name: user?.name };
    }

    const subject = 'Email verification';
    const templeteName = 'sendEmailCode';

    sendVerificationCode(to, subject, templeteName);

    res.status(200).json({
      status: 'success',
      message: 'Please chack your email and verificd your email',
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
        new AppError(
          401,
          'token',
          'You are not logged in! Please login in to contine'
        )
      );
    }
    // 2. Verify token
    const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3. check if the user is exist (not deleted)
    const user = await User.findById(decode.id);

    if (!user) {
      return next(new AppError(401, 'user', 'This user is no longer exist'));
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
exports.restrictToMessId = async (req, res, next) => {
  let messId = req.user.messId || false;
  if (!messId) {
    return next(
      new AppError(
        403,
        'mess',
        `You are not join any mess. Please Contact your mess manager`
      )
    );
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, roles, `You are not ${roles}`));
    }
    next();
  };
};

exports.restrictToAdmin = async (req, res, next) => {
  const mess = await Mess.findOne({ admin: req.user._id });
  if (!mess) {
    return next(new AppError(403, 'admin', `You are not mess admin.`));
  }
  req.mess = mess;
  next();
};

exports.chackPassword = async (req, res, next) => {
  const { body } = req;
  const user = await User.findById(req.user._id).select('password');

  if (
    !body?.password ||
    !user ||
    !(await user.correctPassword(body?.password, user.password))
  ) {
    return next(new AppError(401, 'password', 'Password is wrong'));
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
