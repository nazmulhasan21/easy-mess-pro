const { body } = require('express-validator');
const User = require('../models/userModel');

exports.signupValidat = [
  body('email')
    .trim()
    // .isEmail({ require_display_name: true })
    .withMessage((value) => {
      return `'${value}' not a valid email.`;
    })
    .notEmpty()
    .withMessage('Plese enter any valid email.')
    .custom((value, { req }) => {
      return User.findOne({ email: value }).then((userDoc) => {
        if (userDoc) {
          return Promise.reject('E-Mail address already exists!');
        }
      });
    })
    .normalizeEmail(),
  body('phone')
    .trim()
    .isMobilePhone('bn-BD')
    .withMessage((value) => {
      return `'${value}' not a valid phone Number.`;
    })
    .notEmpty()
    .withMessage('Plese write any valid phone Number.')
    .custom((value, { req }) => {
      return User.findOne({ phone: value }).then((userDoc) => {
        if (userDoc) {
          return Promise.reject('Phone number already exists!');
        }
      });
    }),

  body('password')
    .trim()
    .isLength({ min: 8 })
    .withMessage('password  min length 8.')
    ///.isStrongPassword({ returnScore: false })
    .withMessage(
      'Password must be greater than 8 and contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  body('name')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Plese name min length 3.')
    .matches(/^[a-zA-Z. ]+$/)
    .withMessage('Plese enter valid name'),
  body('role')
    .trim()
    .isIn(['border', 'manager', 'admin'])
    .withMessage("Plese select right role In 'border or manager' own.")
    .notEmpty()
    .withMessage('Plese select any one is your role.'),
];

exports.updateMeValidat = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Plese name min length 3.')
    .matches(/^[a-zA-Z. ]+$/)
    .withMessage('Plese enter valid name'),
  body('address')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Type your address porperly.'),
  // .matches(/^[a-zA-Z0-9., ]+$/)
  // .withMessage('Plese enter valid address'),
  body('institution')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Type institution properly')
    .matches(/^[a-zA-Z0-9., ]+$/)
    .withMessage('Plese enter valid institution'),
];

module.exports.addMemberEmailValidat = [
  body('email')
    .trim()
    .custom(async (value, { req }) => {
      const user = await User.findOne({ email: value });
      if (!user) {
        return Promise.reject('User not found!');
      }
      // const equalss = user.messId.equals(req.user.messId);
      const messId = user.messId || false;
      // if(messId ){}
      const equal = JSON.stringify(messId) === JSON.stringify(req.user.messId);
      const notequal =
        JSON.stringify(messId) === JSON.stringify(req.user.messId);

      // console.log(user.messId, req.user.messId);
      if (equal) {
        return Promise.reject('User all ready exit in your Mess');
      }
      if (notequal) {
        return Promise.reject('User all ready exit in other Mess');
      }

      return (req.newUser = user);
    })

    .isEmail()
    .withMessage((value) => {
      return `'${value}' not a valid email.`;
    })
    .notEmpty()
    .withMessage('Plese enter any valid email.')

    .normalizeEmail(),
];

module.exports.addCostInputValidat = [
  body('type')
    .trim()
    .isIn(['bigCost', 'smallCost', 'otherCost'])
    .withMessage(
      "Plese select right role In 'bigCost or smallCost or otherCost' own."
    )
    .notEmpty()
    .withMessage('Plese select any one cost type.'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Plese write any your cost type title.')
    .isLength({ min: 3, max: 50 })
    .withMessage('Plese your  title is max:50'),
  // .matches(/^[a-zA-Z0-9., ]+$/)
  // .withMessage('Plese enter valid Cost title'),
  body('amount')
    .trim()
    .matches(/^[0-9.-]+$/)
    .withMessage('Plese enter valid amount'),
  // body('date').isISO8601().toDate().withMessage('Plese value must be date'),
];

// exports.addRichOrCashInputValidat = [
//   body('amount').trim().withMessage('Plese ').notEmpty().withMessage('Plese '),
// ];
exports.chPassInVali = [
  body('password')
    .trim()
    .isLength({ min: 8 })
    .withMessage('password  min length 8.'),
  body('newPassword')
    .trim()
    .isLength({ min: 8 })
    .withMessage('newPassword  min length 8.'),
];

exports.emailCodeInVali = [
  body('email')
    .trim()
    .isEmail()
    .withMessage((value) => {
      return `'${value}' not a valid email.`;
    })
    .notEmpty()
    .withMessage('Plese enter any valid email.')
    .normalizeEmail(),
  body('code')
    .trim()
    .isLength({ min: 4 })
    .withMessage('Write your code proparly.'),
];

exports.emailVelit = [
  body('email')
    .trim()
    .isEmail()
    .withMessage((value) => {
      return `'${value}' not a valid email.`;
    })
    .notEmpty()
    .withMessage('Plese enter any valid email.')
    .custom((value, { req }) => {
      return User.findOne({ email: value }).then((userDoc) => {
        if (userDoc) {
          return Promise.reject('E-Mail address already exists!');
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
      return `'${value}' not a valid email.`;
    })
    .notEmpty()
    .withMessage('Plese enter any valid email.')
    .normalizeEmail(),
];
