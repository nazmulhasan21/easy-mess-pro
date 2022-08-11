const moment = require('moment');

const User = require('../models/userModel');
const UserMonthData = require('../models/userMonthDataModel');
const Cash = require('../models/cashModel');
const Meal = require('../models/mealModel');
const Rich = require('../models/richModel');
const Cost = require('../models/costModel');
const Month = require('../models/monthModel');
const OtpCode = require('../models/otpCodeModel');

/**
 *
 * @param {object} user req user object
 * @param {object} mess user mess object
 */

// create month and other data
module.exports.createMonth = async (user, mess) => {
  //  1. create  your active month

  const monthTitle = moment().format('MMMM YYYY');
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
  month.userMonthData.push(userMonthData);
  user.months.push(month);
  user.messId = messId;
  await user.save();

  await month.save();
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
