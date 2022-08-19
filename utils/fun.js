const moment = require('moment');
const _ = require('lodash');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');

const User = require('../models/userModel');
const UserMonthData = require('../models/userMonthDataModel');
const Cash = require('../models/cashModel');
const Meal = require('../models/mealModel');
const GuestMeal = require('../models/guestMealModel');
const Rich = require('../models/richModel');
const Cost = require('../models/costModel');
const Month = require('../models/monthModel');
const OtpCode = require('../models/otpCodeModel');
const { sendEmail } = require('./sendEmail');
const createPDF = require('./createPDF');
const Mess = require('../models/messModel');
const ExtraRich = require('../models/extraRichModel');

/**
 *
 * @param {object} user req user object
 * @param {object} mess user mess object
 * @param {string} title month title
 */

// create month and other data
module.exports.createMonth = async (user, mess, title) => {
  //  1. create  your active month

  const monthTitle = moment(title).format('MMMM YYYY');
  const month = await Month.create({
    messId: mess._id,
    monthTitle,
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
};

/**
 *
 * @param {User._id} userId mess member user id
 * @param {object} month active month object
 * @param {Mess._id} messId user mess Id
 */

module.exports.createUserMonthData = async (userId, month, messId) => {
  const user = await User.findById(userId);
  const userMonthData = new UserMonthData({
    userId,
    userName: user.name,
    monthId: month._id,
    messId,
  });
  await userMonthData.save();

  // user.userMonthData.push(userMonthData);
  user.months.push(month);
  user.messId = messId;
  await user.save();
};

/**
 *
 * @param {User._id} userId mess member user id
 * @param {object} month active month object
 */
module.exports.deleteUserMonthData = async (userId, month) => {
  const userMonthData = await UserMonthData.findOneAndDelete({
    $and: [{ userId: userId }, { monthId: month._id }],
  });

  month.userMonthData.pull(userMonthData._id);

  const user = await User.findOne({
    $and: [{ _id: userId }, { messId: userMonthData.messId }],
  });
  user.months = [];
  user.role = 'border';
  user.messId = undefined;

  await month.save();
  await user.save();
};

/**
 *
 * @param {User._id} userId mess member user id
 * @param {object} month active month object
 */

module.exports.deleteOtherDataInActiveMonth = async (userId, month) => {
  // 1. find all delete user cashs

  const cashs = await Cash.find({
    $and: [{ userId: userId }, { monthId: month._id }],
  });
  // 2. delete all cash in active month cashs array
  cashs.forEach((cash) => {
    month.cashs.pull(cash._id);
  });

  // 3. find all delete user meals

  const meals = await Meal.find({
    $and: [{ userId: userId }, { monthId: month._id }],
  });

  // 4. delete all meals in active month meals array
  meals.forEach((meal) => {
    month.meals.pull(meal._id);
  });

  // 5 . find all delete user richs
  const richs = await Rich.find({
    $and: [{ userId: userId }, { monthId: month._id }],
  });

  // 6. delete all richs in active month richs array
  richs.forEach((rich) => {
    month.richs.pull(rich._id);
  });

  await month.save();
};

/**
 * delete user mess
 * @param {Mess._id} messId user mess Id
 */
module.exports.deleteAll = async (messId) => {
  // 1. delete all meal in mess
  await Meal.deleteMany({ messId: messId });

  // 2. delete all Rich in mess
  await Rich.deleteMany({ messId: messId });

  // 3. delete all cash in mess
  await Cash.deleteMany({ messId: messId });

  // 4. delete all userMonth data
  await UserMonthData.deleteMany({ messId: messId });

  // 5. delete all cost in mess
  await Cost.deleteMany({ messId: messId });

  // 6. delete all add user months and messId proparty

  // 6.1 find user
  const users = await User.find({ messId: messId }).select('messId months');
  // 6.2 set user proparty months = [] and messId = undefind
  users.forEach(async (user) => {
    user.months = [];
    user.messId = undefined;
    // 6.3 save user
    await user.save();
  });
};

/**
 *
 * @param {Month._id} monthId active month id
 * @param {Array} allMember all member array
 */
exports.deleteAllMonthData = async (monthId, allMember) => {
  // 1. delete this month cashs
  await Cash.deleteMany({ monthId: monthId });

  // 2. delete this month costs
  await Cost.deleteMany({ monthId: monthId });

  // 3. delete this month meals
  await Meal.deleteMany({ monthId: monthId });

  // 4. delete this month richs
  await Rich.deleteMany({ monthId: monthId });

  // 5. delete this month User month data
  await UserMonthData.deleteMany({ monthId: monthId });

  // 6. delete all user months in this month id
  allMember.forEach(async (userId) => {
    const user = await User.findById(userId).select('months');
    user.months.pull(monthId);
    await user.save();
  });
};

// create otp code
/**
 *
 * @param {emailString} email is user email
 * @returns {object} otpCode object
 */

exports.createOtpCode = async (email) => {
  // find  this user before all otpCode and delete
  await OtpCode.deleteMany({ email });
  // jenaret verification code
  const code = Math.floor(1000 + Math.random() * 9000);
  const expiredAt = new Date().getTime() + 30 * 60 * 1000;

  // save this code in database
  const otpCode = await OtpCode.create({
    email: email,
    code: code,
    expiredAt: expiredAt,
  });
  return otpCode;
};

// not work
exports.chackOtpCode = async (email, htmlTemplates) => {
  const otpCode = await OtpCode.findOne({ email, code });
  if (!otpCode) {
    return next(new AppError(401, 'code', `code is worng`));
  }

  // expired time
  const expired = otpCode?.expiredAt - new Date().getTime();
  if (expired < 0) {
    await OtpCode.findByIdAndDelete(otpCode._id);
    const otpCode = await createOtpCode(newEmail);
    const to = [{ newEmail, name: user.name }];
    const subject = 'Email varification';
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
      'code is expired. please chack email sending new code'
    );
  }
};

/**
 *
 * @param {object} to email object
 * @param {string} subject  subject
 * @param {string} templeteName email templete Name
 * @returns
 */
exports.sendVerificationCode = async (to, subj, templeteName) => {
  const otpCode = await this.createOtpCode(to.email);
  const reciver = [to];
  const subject = subj;
  const filePath = path.join(
    process.cwd(),
    'emailTemplates',
    `${templeteName}.html`
  );

  // get the html
  const html = fs.readFileSync(filePath).toString();

  const params = {
    userName: to.name,
    code: otpCode.code,
    subject: subj,
  };
  // send email
  sendEmail(reciver, subject, html, params);
};

// get pdf
/**
 *
 * @param {ObjectId} monthId
 * @returns
 */
exports.getMonthPdf = async (monthId) => {
  const data = await Month.findById(monthId).populate(
    'manager',
    'name role avater'
  );

  const userMonthData = await UserMonthData.find({ monthId: monthId });
  const costs = await Cost.find({ monthId: monthId });
  const bigCost = _.filter(costs, ['type', 'bigCost']);
  const smallCost = _.filter(costs, ['type', 'smallCost']);
  const otherCost = _.filter(costs, ['type', 'otherCost']);
  // sub
  const bigCostSum = _.sumBy(bigCost, 'amount');
  const smallCostSum = _.sumBy(smallCost, 'amount');
  const otherCostSum = _.sumBy(otherCost, 'amount');

  const meals = await Meal.find({ monthId: monthId }).populate(
    'userId',
    'name avater'
  );
  const richs = await Rich.find({ monthId: monthId }).populate(
    'userId',
    'name avater'
  );
  const cashs = await Cash.find({ monthId: monthId }).populate(
    'userId',
    'name avater'
  );
  const guestMeals = await GuestMeal.find({ monthId: monthId }).populate(
    'userId',
    'name avater'
  );
  const extraRich = await ExtraRich.find({ monthId: monthId }).populate(
    'userId',
    'name avater'
  );

  data.userMonthData = userMonthData;
  data.guestMeals = guestMeals;
  data.extraRich = extraRich;
  data.costs = [
    { name: 'Bajar cost Table', details: bigCost, total: bigCostSum },
    { name: 'Small cost Table', details: smallCost, total: smallCostSum },
    { name: 'Other cost Table', details: otherCost, total: otherCostSum },
  ];
  data.meals = meals;
  data.richs = richs;
  data.cashs = cashs;
  const pdf = await createPDF('index', data);
  if (pdf) {
    return true;
  }
};

// test/////
const tt = async () => {
  const name = 'Md Nazmul ';
  const randomNum = Math.floor(10 + Math.random() * 90).toString();

  const username = name.split(' ').join('');
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
};

//tt();

// date formet in hbs template
hbs.registerHelper('dateFormat', function (date, options) {
  const formatToUse =
    (arguments[1] && arguments[1].hash && arguments[1].hash.format) ||
    'DD/MM/YYYY';
  return moment(date).format(formatToUse);
});
