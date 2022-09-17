const moment = require('moment');
const _ = require('lodash');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');

const User = require('../models/userModel');
const UserMonthData = require('../models/userMonthDataModel');
const MonthMemberData = require('../models/monthMemberDataModel');
const Meal = require('../models/mealModel');

const Cost = require('../models/costModel');
const Month = require('../models/monthModel');
const OtpCode = require('../models/otpCodeModel');
const { sendEmail } = require('./sendEmail');
const createPDF = require('./createPDF');
const Mess = require('../models/messModel');

/**
 *
 * @param {object} user req user object
 * @param {object} mess user mess object
 * @param {string} monthName month title
 */

// create month and other data
module.exports.createMonth = async (user, mess, monthName) => {
  try {
    //  1. create  your active month

    const month = await Month.create({
      messId: mess._id,
      monthName,
      manager: user._id,
    });

    // 2. add monthId in mess
    mess.month.push(month);
    await mess.save();
    // 3. create user Month data
    mess.allMember.forEach(async (user) => {
      await this.createUserMonthData(user._id, month, mess._id);
    });

    await month.save();
    return true;
  } catch (error) {
    return error;
  }
};

/**
 *
 * @param {User._id} userId mess member user id
 * @param {object} month active month object
 * @param {Mess._id} messId user mess Id
 */

module.exports.createUserMonthData = async (userId, month, messId) => {
  try {
    const user = await User.findById(userId);
    const userMonthData = new UserMonthData({
      userId,
      monthId: month._id,
      messId,
    });
    await userMonthData.save();

    user.months.push(month);
    user.messId = messId;
    await user.save();
  } catch (error) {
    return error;
  }
};

/**
 *
 * @param {User._id} userId mess member user id
 * @param {object} month active month object
 */
module.exports.deleteUserMonthData = async (userId, month) => {
  try {
    await UserMonthData.findOneAndDelete({
      $and: [{ userId: userId }, { monthId: month._id }],
    });
    await MonthMemberData.deleteMany({
      $and: [{ userId: userId }, { monthId: month._id }],
    });
    await Meal.deleteMany({
      $and: [{ userId: userId }, { monthId: month._id }],
    });
    const user = await User.findOne({ _id: userId });
    user.months = [];
    user.role = 'border';
    user.messId = undefined;

    await user.save();
  } catch (error) {
    return error;
  }
};

/**
 * delete user mess
 * @param {Mess._id} messId user mess Id
 */
module.exports.deleteAll = async (messId) => {
  try {
    // 1. delete all meal in mess
    await Meal.deleteMany({ messId: messId });
    await Cost.deleteMany({ messId: messId });

    // 2. delete all month member data in mess
    await MonthMemberData.deleteMany({ messId: messId });

    // 6. delete all user months data
    await UserMonthData.deleteMany({ messId: messId });
    // 6.1 find user
    const users = await User.find({ messId: messId }).select('messId months');
    // 6.2 set user property months = [] and messId = undefined
    users.forEach(async (user) => {
      user.months = [];
      user.messId = undefined;
      // 6.3 save user
      await user.save();
    });
  } catch (error) {
    return error;
  }
};

/**
 *
 * @param {Month._id} monthId active month id
 * @param {Array} allMember all member array
 */
exports.deleteAllMonthData = async (monthId, allMember) => {
  try {
    // 1. delete this month cashes
    await MonthMemberData.deleteMany({ monthId: monthId });

    // 2. delete this month costs
    await Cost.deleteMany({ monthId: monthId });

    // 3. delete this month meals
    await Meal.deleteMany({ monthId: monthId });

    // 5. delete this month User month data
    await UserMonthData.deleteMany({ monthId: monthId });

    // 6. delete all user months in this month id
    allMember.forEach(async (userId) => {
      const user = await User.findById(userId).select('months');
      user.months.pull(monthId);
      await user.save();
    });
  } catch (error) {
    return error;
  }
};

// create otp code
/**
 *
 * @param {emailString} email is user email
 * @returns {object} otpCode object
 */

exports.createOtpCode = async (email) => {
  try {
    // find  this user before all otpCode and delete
    await OtpCode.deleteMany({ email });
    // generate verification code
    const code = Math.floor(1000 + Math.random() * 9000);
    const expiredAt = new Date().getTime() + 30 * 60 * 1000;

    // save this code in database
    const otpCode = await OtpCode.create({
      email: email,
      code: code,
      expiredAt: expiredAt,
    });
    return otpCode;
  } catch (error) {
    return error;
  }
};

// not work
exports.checkOtpCode = async (email, htmlTemplates) => {
  try {
    const otpCode = await OtpCode.findOne({ email, code });
    if (!otpCode) {
      return next(new AppError(401, 'code', `code is wrong`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      await OtpCode.findByIdAndDelete(otpCode._id);
      const otpCode = await createOtpCode(newEmail);
      const to = [{ newEmail, name: user.name }];
      const subject = 'Email verification';
      const html = htmlTemplates;
      const params = {
        userName: user.name,
        code: otpCode.code,
      };
      // send email
      sendEmail(to, subject, html, params);
      return next(
        new AppError(401),
        'code',
        'Code is expired. please check email sending new code'
      );
    }
  } catch (error) {
    return error;
  }
};

/**
 *
 * @param {object} to email object
 * @param {string} subject  subject
 * @param {string} templateName email template Name
 * @returns
 */
exports.sendVerificationCode = async (to, subj, templateName) => {
  try {
    const otpCode = await this.createOtpCode(to.email);
    const receiver = [to];
    const subject = subj;
    const filePath = path.join(
      process.cwd(),
      'emailTemplates',
      `${templateName}.html`
    );

    // get the html
    const html = fs.readFileSync(filePath).toString();

    const params = {
      userName: to?.name,
      code: otpCode.code,
      subject: subj,
    };
    // send email
    const sent = await sendEmail(receiver, subject, html, params);
    return sent;
  } catch (error) {
    return error;
  }
};

// get pdf
/**
 *
 * @param {ObjectId} monthId
 * @returns
 */
exports.getMonthPdf = async (monthId) => {
  try {
    const month = await Month.findById(monthId).populate(
      'manager',
      'name role avatar'
    );

    const userMonthData = await UserMonthData.find({
      monthId: monthId,
    }).populate('userId', 'name avatar');
    const costs = await Cost.find({ monthId: monthId });
    const bigCost = _.filter(costs, ['type', 'bigCost']);
    const smallCost = _.filter(costs, ['type', 'smallCost']);
    const otherCost = _.filter(costs, ['type', 'otherCost']);
    // sub
    const bigCostSum = _.sumBy(bigCost, 'amount');
    const smallCostSum = _.sumBy(smallCost, 'amount');
    const otherCostSum = _.sumBy(otherCost, 'amount');

    const data = await MonthMemberData.find({ monthId: monthId });
    const cash = _.filter(data, ['type', 'cash']);
    const rice = _.filter(data, ['type', 'rice']);
    const extraRice = _.filter(data, ['type', 'extraRice']);
    const guestMeal = _.filter(data, ['type', 'guestMeal']);
    // sub
    const cashSum = _.sumBy(cash, 'amount');
    const riceSum = _.sumBy(rice, 'amount');
    const extraRiceSum = _.sumBy(extraRice, 'amount');
    const guestMealSum = _.sumBy(guestMeal, 'amount');

    const meals = await Meal.find({ monthId: monthId }).populate(
      'userId',
      'name avatar'
    );

    month.userMonthData = userMonthData;
    month.monthMemberData = [
      { name: 'Rice Table', details: rice, total: riceSum },
      { name: 'Cash  Table', details: cash, total: cashSum },
      { name: 'Extra Rich Table', details: extraRice, total: extraRiceSum },
      {
        name: 'Guest Meal Table',
        details: guestMeal,
        total: guestMealSum,
      },
    ];
    month.meals = meals;
    month.costs = [
      { name: 'Other cost Table', details: otherCost, total: otherCostSum },
      { name: 'Bajar cost Table', details: bigCost, total: bigCostSum },
      { name: 'Small cost Table', details: smallCost, total: smallCostSum },
    ];

    const pdf = await createPDF('index', month);
    if (pdf) {
      return true;
    }
  } catch (error) {
    return error;
  }
};

// test/////
const tt = async () => {
  try {
    const name = 'Md Nazmul hasan ';
    const randomNum = Math.floor(10 + Math.random() * 90).toString();

    const username = name.split(' ').join('');
    Md.Nazmulhasan;
    const Md = username.split('Md')[1];
    const md = username.split('md')[1];
    const Mst = username.split('Mst')[1];
    const mst = username.split('mst')[1];
    const dot = username.split('.')[1];
    let finalUserName = '';

    if (dot) {
      finalUserName = dot;
      finalUserName += randomNum;
    } else if (Md || md) {
      finalUserName = Md || md + randomNum;
      finalUserName += randomNum;
    } else if (Mst || mst) {
      finalUserName = Mst || mst + randomNum;
      finalUserName += randomNum;
    } else {
      finalUserName = username + randomNum;
      finalUserName += randomNum;
    }

    console.log(finalUserName.toLowerCase());

    return finalUserName;
  } catch (error) {
    return error;
  }
};

//tt();

// date format in hbs template
hbs.registerHelper('dateFormat', function (date, options) {
  const formatToUse =
    (arguments[1] && arguments[1].hash && arguments[1].hash.format) ||
    'DD/MM/YYYY';
  return moment(date).format(formatToUse);
});
