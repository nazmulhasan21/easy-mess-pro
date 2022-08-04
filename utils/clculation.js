const mongoose = require('mongoose');

const User = require('../models/userModel');
const UserMonthData = require('../models/userMonthDataModel');
const Cash = require('../models/cashModel');
const Meal = require('../models/mealModel');
const Rich = require('../models/richModel');
const Cost = require('../models/costModel');
const Month = require('../models/monthModel');

/**
 * claculation all user data in databaes
 * @param {User._id} userId mess member user id
 * @param {object} month  active month object
 * @param {Number} totalMember  mess total member
 */

exports.calculator = async (userId, month, totalMember) => {
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

  const bigCost = cost?.bigCost || 0;
  const smallCost = cost?.smallCost || 0;
  const otherCost = cost?.otherCost || 0;

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

  //3. calculate active month rich
  const monthRichSum = await Rich.aggregate([
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
  const monthRich = monthRichSum[0];

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

  // 5. calculate user Cash
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

  // 6. calculate user rich

  const richSum = await Rich.aggregate([
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
  const rich = richSum[0];

  // 7. calculate user Meal
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

  // 8. update month Modeal
  month.totalDeposit = monthCash?.total || 0;
  month.totalRich = monthRich?.total || 0;
  month.totalMealCost = bigCost + smallCost || 0;
  month.totalOtherCost = otherCost || 0;
  month.otherCostPerPerson = (month.totalOtherCost / totalMember).toFixed(2);
  month.totalCost = bigCost + smallCost + otherCost || 0;
  month.balance = month.totalDeposit - month.totalCost || 0;
  month.totalMeal = monthMeal?.total || 1;
  month.richBalance = month.totalRich - month.totalMeal || 0;

  // calculate month total fixed meal
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

  month.totalFixedMeal = monthFixedMeal?.total;

  month.mealRate = (month.totalMealCost / month.totalFixedMeal).toFixed(2);

  // 6. update userMonthData Model

  // set value this porportes
  userMonthData.totalMeal = meal?.total || 1;
  userMonthData.fixedMeal =
    userMonthData.totalMeal > month.fixedMeal
      ? userMonthData.totalMeal
      : month.fixedMeal;
  userMonthData.totalDeposit = cash?.total || 0;
  userMonthData.totalDepositRich = rich?.total || 0;

  userMonthData.richBalance =
    userMonthData.totalDepositRich - userMonthData.totalMeal;

  userMonthData.mealCost = (userMonthData.fixedMeal * month.mealRate).toFixed(
    2
  );
  userMonthData.otherCost = month.otherCostPerPerson.toFixed(2);
  userMonthData.totalCost = (
    userMonthData.mealCost + userMonthData.otherCost
  ).toFixed(2);
  userMonthData.balance = (
    userMonthData.totalDeposit - userMonthData.totalCost
  ).toFixed(2);

  // 7. save to databaes
  await userMonthData.save();
  await month.save();
};
