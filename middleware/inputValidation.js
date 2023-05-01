const { body } = require('express-validator');
const User = require('../models/userModel');

exports.signupValidate = [
  body('email')
    .trim()
    .isEmail()
    .withMessage((value) => {
      return `'${value}'একটি বৈধ ইমেল নয়।`;
    })
    .notEmpty()
    .withMessage('কোনো বৈধ ইমেল লিখুন দয়া করে.')
    .custom((value, { req }) => {
      return User.findOne({ email: value }).then((userDoc) => {
        if (userDoc) {
          return Promise.reject('ই - মেইল ​​টি আগে থেকেই আছে!');
        }
      });
    })
    .normalizeEmail(),
  body('phone')
    .trim()
    .isMobilePhone('bn-BD')
    .withMessage((value) => {
      return `'${value}' একটি বৈধ ফোন নম্বর নয়।`;
    })
    .notEmpty()
    .withMessage('কোন বৈধ ফোন নম্বর লিখুন.')
    .custom((value, { req }) => {
      return User.findOne({ phone: value }).then((userDoc) => {
        if (userDoc) {
          return Promise.reject('ফোন নম্বর টি আগে থেকেই আছে!');
        }
      });
    }),

  body('password')
    .trim()
    .isLength({ min: 8 })
    .withMessage('পাসওয়ার্ড সর্বনিম্ন ৮ সংখ্যার হতে হবে।'),
  ///.isStrongPassword({ returnScore: false })
  // .withMessage(
  //   'Password must be greater than 8 and contain at least one uppercase letter, one lowercase letter, and one number'
  // ),
  body('name')
    .trim()
    .isLength({ min: 3 })
    .withMessage('অনুগ্রহ করে নাম  সর্বনিম্ন ৩ অক্ষর হতে হবে।')
    .matches(/^[a-zA-Z. ]+$/)
    .withMessage('বৈধ নাম লিখুন'),
  body('role')
    .trim()
    .isIn(['border', 'manager', 'admin'])
    .withMessage(
      "অনুগ্রহ করে 'বর্ডার বা ম্যানেজার'-এ সঠিক ভূমিকা নির্বাচন করুন।"
    )
    .notEmpty()
    .withMessage('যে কোনো একটি নির্বাচন করুন।'),
];

exports.updateMeValidate = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('অনুগ্রহ করে নাম  সর্বনিম্ন ৩ অক্ষর হতে হবে।')
    .matches(/^[a-zA-Z. ]+$/)
    .withMessage('বৈধ নাম লিখুন'),
  body('address')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('আপনার ঠিকানা সঠিকভাবে টাইপ করুন.'),
  // .matches(/^[a-zA-Z0-9., ]+$/)
  // .withMessage('Please enter valid address'),
  body('institution')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('প্রতিষ্ঠান নাম সঠিকভাবে টাইপ করুন')
    .matches(/^[a-zA-Z0-9., ]+$/)
    .withMessage('বৈধ প্রতিষ্ঠানের নাম লিখুন'),
];

module.exports.addMemberEmailValidated = [
  body('email')
    .trim()
    .custom(async (value, { req }) => {
      const user = await User.findOne({
        $and: [
          { $or: [{ email: value }, { phone: value }] },
          { emailVerified: true },
        ],
      });
      if (!user) {
        return Promise.reject('বৈধ ব্যবহারকারী খুঁজে পাওয়া যায় নি!');
      }
      // const equal = user.messId.equals(req.user.messId);
      const messId = user.messId || false;
      // if(messId ){}
      const equal = JSON.stringify(messId) === JSON.stringify(req.user.messId);
      const notequal =
        JSON.stringify(messId) === JSON.stringify(req.user.messId);

      // console.log(user.messId, req.user.messId);
      if (equal) {
        return Promise.reject('ব্যাক্তিটি আপনার মেসে আগে থেকেই আছে।');
      }
      if (notequal) {
        return Promise.reject('ব্যাক্তিটি অন্য মেসে আগে থেকেই আছে।');
      }

      return (req.newUser = user);
    })

    // .isEmail()
    // .withMessage((value) => {
    //   return `'${value}' একটি বৈধ ইমেল নয়।`;
    // })
    .notEmpty()
    .withMessage('কোনো বৈধ ইমেল বা মোবাইল নম্বর লিখুন।'),

  // .normalizeEmail(),
];

module.exports.addCostInputValidated = [
  body('type')
    .trim()
    .isIn(['bigCost', 'smallCost', 'otherCost'])
    .withMessage(
      "অনুগ্রহ করে 'বিগকস্ট বা স্মলকোস্ট বা অন্য কস্ট'-এ সঠিক ভূমিকা নির্বাচন করুন।"
    )
    .notEmpty()
    .withMessage('অনুগ্রহ করে যেকোনো একটি খরচের ধরন নির্বাচন করুন।'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('অনুগ্রহ করে আপনার খরচের প্রকার শিরোনাম লিখুন।')
    .isLength({ min: 3, max: 50 })
    .withMessage('অনুগ্রহ করে আপনার শিরোনাম ৫০ অক্ষর এর বেশি হতে পারে না।'),
  // .matches(/^[a-zA-Z0-9., ]+$/)
  // .withMessage('Please enter valid Cost title'),
  body('amount')
    .trim()
    .matches(/^[0-9.-]+$/)
    .withMessage('বৈধ পরিমাণ লিখুন'),
  // body('date').isISO8601().toDate().withMessage('Please value must be date'),
];

module.exports.addMonthMemberDataInputValidated = [
  body('type')
    .trim()
    .isIn(['cash', 'rice', 'extraRice', 'guestMeal', 'extraCost'])
    .withMessage(
      'অনুগ্রহ করে নগদ বা চাল বা অতিরিক্ত চাল বা অতিথি খাবার বা অতিরিক্ত মূল্য নির্বাচন করুন'
    )
    .notEmpty()
    .withMessage('অনুগ্রহ করে যেকোনো একটি ডেটা টাইপ নির্বাচন করুন।'),
  body('amount')
    .trim()
    .matches(/^[0-9.-]+$/)
    .withMessage('বৈধ পরিমাণ লিখুন'),
  // body('date').isISO8601().toDate().withMessage('Please value must be date'),
];
exports.chPassInValid = [
  body('password')
    .trim()
    .isLength({ min: 8 })
    .withMessage('পাসওয়ার্ড সর্বনিম্ন ৮ সংখ্যার হতে হবে।'),
  body('newPassword')
    .trim()
    .isLength({ min: 8 })
    .withMessage('পাসওয়ার্ড সর্বনিম্ন ৮ সংখ্যার হতে হবে।'),
];

exports.emailCodeInValid = [
  body('email')
    .trim()
    .isEmail()
    .withMessage((value) => {
      return `'${value}' একটি বৈধ ইমেল নয়।`;
    })
    .notEmpty()
    .withMessage('কোনো বৈধ ইমেল লিখুন দয়া করে.')
    .normalizeEmail(),
  body('code')
    .trim()
    .isLength({ min: 4 })
    .withMessage('আপনার কোড সঠিকভাবে লিখুন।'),
];

exports.emailValid = [
  body('email')
    .trim()
    .isEmail()
    .withMessage((value) => {
      return `'${value}' একটি বৈধ ইমেল নয়।`;
    })
    .notEmpty()
    .withMessage('কোনো বৈধ ইমেল লিখুন দয়া করে.')
    .custom((value, { req }) => {
      return User.findOne({ email: value }).then((userDoc) => {
        if (userDoc) {
          return Promise.reject('ই - মেইল ​​টি আগে থেকেই আছে!');
        }
      });
    })
    .normalizeEmail(),
];
exports.isEmailInput = [
  body('email')
    .trim()
    .isEmail()
    .withMessage((value) => {
      return `'${value}' একটি বৈধ ইমেল নয়।`;
    })
    .notEmpty()
    .withMessage('কোনো বৈধ ইমেল লিখুন দয়া করে.')
    .normalizeEmail(),
];
