const mongoose = require('mongoose');

const User = require('../models/userModel');
const UserMonthData = require('../models/userMonthDataModel');
const Cash = require('../models/cashModel');
const Meal = require('../models/mealModel');
const Rice = require('../models/riceModel');
const Cost = require('../models/costModel');
const GuestMeal = require('../models/guestMealModel');
const ExtraRice = require('../models/extraRiceModel');
const Month = require('../models/monthModel');

/**
 *
 * @param {Object} month object
 */
exports.monthCal = async (month) => {
  // 1. calculate active month cost
  const costSum = await Cost.aggregate([
    {
      $match: {
        $and: [
          { messId: new mongoose.Types.ObjectId(month.messId) },
          { monthId: new mongoose.Types.ObjectId(month._id) },
        ],
      },
    },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  const cost = {};
  costSum.forEach((costItem) => {
    cost[costItem._id] = costItem.total;
  });

  // 2. calculate active month  cash
  const monthCashSum = await Cash.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { messId: new mongoose.Types.ObjectId(month.messId) },
        ],
      },
    },
    { $group: { _id: '$monthId', total: { $sum: '$amount' } } },
  ]);
  const monthCash = monthCashSum[0];

  //3. calculate active month rice
  const monthRiceSum = await Rice.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { messId: new mongoose.Types.ObjectId(month.messId) },
        ],
      },
    },
    { $group: { _id: '$monthId', total: { $sum: '$amount' } } },
  ]);
  const monthRice = monthRiceSum[0];
  // **** calculate active month extra Rice

  const monthExtraRiceSum = await ExtraRice.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { messId: new mongoose.Types.ObjectId(month.messId) },
        ],
      },
    },
    { $group: { _id: '$monthId', total: { $sum: '$amount' } } },
  ]);
  const monthExtraRice = monthExtraRiceSum[0];

  //4. calculate active month meal
  const monthMealSum = await Meal.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { messId: new mongoose.Types.ObjectId(month.messId) },
        ],
      },
    },
    { $group: { _id: '$monthId', total: { $sum: '$total' } } },
  ]);
  const monthMeal = monthMealSum[0];

  //5. calculate active month guest meal
  const monthGuestMealSum = await GuestMeal.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { messId: new mongoose.Types.ObjectId(month.messId) },
        ],
      },
    },
    { $group: { _id: '$monthId', total: { $sum: '$amount' } } },
  ]);
  const monthGuestMeal = monthGuestMealSum[0];

  // 6. calculate month total fixed meal
  const monthFixedMealSum = await UserMonthData.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { messId: new mongoose.Types.ObjectId(month.messId) },
        ],
      },
    },
    { $group: { _id: '$monthId', total: { $sum: '$fixedMeal' } } },
  ]);
  const monthFixedMeal = monthFixedMealSum[0];

  // 7. calcutate month total border;
  const totalMemberSum = await UserMonthData.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { messId: new mongoose.Types.ObjectId(month.messId) },
        ],
      },
    },
    { $group: { _id: '$monthId', total: { $sum: 1 } } },
  ]);
  const totalMember = totalMemberSum[0];

  // 10. update month Modeal
  month.totalDeposit = monthCash?.total || 0;
  month.totalRice = monthRice?.total || 0;
  month.totalGuestMealAmount = monthGuestMeal?.total || 0;
  month.totalBigCost = cost?.bigCost || 0;
  month.totalSmallCost = cost?.smallCost || 0;
  month.totalMealCost = month.totalBigCost + month.totalSmallCost;
  month.totalOtherCost = cost?.otherCost || 0;
  month.otherCostPerPerson = (
    month.totalOtherCost / totalMember?.total
  ).toFixed(2);
  month.totalCost =
    month.totalBigCost + month.totalSmallCost + month.totalOtherCost;
  month.balance = month.totalDeposit - month.totalCost || 0;
  month.totalMeal = monthMeal?.total || 1;
  month.riceBalance =
    month.totalRice - month.totalMeal - monthExtraRice?.total || 0;

  month.totalFixedMeal = monthFixedMeal?.total;

  month.mealRate = (month.totalMealCost / month.totalFixedMeal).toFixed(2);
  await month.save();
};

/**
 * claculation all user data in databaes
 * @param {User._id} userId mess member user id
 * @param {object} month  active month object
 * @param {Number} totalMember  mess total member
 */

exports.userMonthCal = async (userId, month) => {
  // 6. calculate user Cash
  const cashSum = await Cash.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { userId: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  ]);
  const cash = cashSum[0];

  // 7. calculate user rice

  const riceSum = await Rice.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { userId: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  ]);
  const rice = riceSum[0];

  // *****  calculate user extra rice

  const extraRiceSum = await ExtraRice.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { userId: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  ]);
  const extraRice = extraRiceSum[0];

  // 8. calculate user Guest Meal

  const guestMealSum = await GuestMeal.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { userId: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  ]);
  const guestMeal = guestMealSum[0];

  // 9. calculate user Meal
  const mealSum = await Meal.aggregate([
    {
      $match: {
        $and: [
          { monthId: new mongoose.Types.ObjectId(month._id) },
          { userId: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    { $group: { _id: '$userId', total: { $sum: '$total' } } },
  ]);
  const meal = mealSum[0];
  // **** find user month data ****
  const userMonthData = await UserMonthData.findOne({
    $and: [{ userId: userId }, { monthId: month._id }],
  });

  // 11. update userMonthData Model

  // set value this porportes
  userMonthData.totalMeal = meal?.total || 1;
  userMonthData.fixedMeal =
    userMonthData.totalMeal > month.fixedMeal
      ? userMonthData.totalMeal
      : month.fixedMeal;
  userMonthData.totalDeposit = cash?.total || 0;
  userMonthData.totalDepositRice = rice?.total || 0;
  userMonthData.totalExtraRice = extraRice?.total || 0;

  userMonthData.riceBalance =
    userMonthData.totalDepositRice -
    userMonthData.totalMeal -
    userMonthData.totalExtraRice;

  userMonthData.mealCost = (userMonthData.fixedMeal * month.mealRate).toFixed(
    2
  );
  userMonthData.totalGuestMealAmount = guestMeal?.total || 0;
  userMonthData.otherCost = month.otherCostPerPerson.toFixed(2);
  userMonthData.totalCost = (
    userMonthData.mealCost +
    userMonthData.otherCost +
    userMonthData.totalGuestMealAmount
  ).toFixed(2);
  userMonthData.balance = (
    userMonthData.totalDeposit - userMonthData.totalCost
  ).toFixed(2);

  // 12. save to databaes
  const userdata = await userMonthData.save();
  return userdata;
};
