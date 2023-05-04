const mongoose = require('mongoose');

// model
const User = require('../models/userModel');
const UserMonthData = require('../models/userMonthDataModel');
const MonthMemberData = require('../models/monthMemberDataModel');
const Meal = require('../models/mealModel');
const Cost = require('../models/costModel');

/**
 *
 * @param {Object} month object
 */
exports.monthCal = async (month) => {
  try {
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
    // 2. calculate active month member data cost
    const monthMemberDataSum = await MonthMemberData.aggregate([
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

    const monthMemberData = {};
    monthMemberDataSum.forEach((monthMemberDataItem) => {
      monthMemberData[monthMemberDataItem._id] = monthMemberDataItem.total;
    });

    //3. calculate active month meal
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

    // 4. calculate month total fixed meal
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

    // 5. calculated month total border;
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

    // 6. update month Model

    const bigCost = cost?.bigCost || 0;
    const smallCost = cost?.smallCost || 0;
    const otherCost = cost?.otherCost || 0;

    const cash = monthMemberData?.cash || 0;
    const rice = monthMemberData?.rice || 0;
    const extraRice = monthMemberData?.extraRice || 0;
    const guestMeal = monthMemberData?.guestMeal || 0;

    month.totalDeposit = cash;
    month.totalRice = rice;
    month.totalGuestMealAmount = guestMeal;
    month.totalBigCost = bigCost;
    month.totalSmallCost = smallCost;
    month.totalMealCost = bigCost + smallCost;
    month.totalOtherCost = otherCost;
    month.otherCostPerPerson = (
      month?.totalOtherCost / totalMember?.total
    ).toFixed(2);
    month.totalCost = bigCost + smallCost + otherCost;
    month.balance = cash - (bigCost + smallCost + otherCost);
    month.totalMeal = monthMeal?.total || 1;
    const addRich = await MonthMemberData.find({
      $and: [
        { messId: month.messId },
        { monthId: month._id },
        { type: 'rice' },
      ],
    });
    if (addRich.length > 0) {
      month.riceBalance = rice - month.totalMeal - extraRice;
    } else {
      month.riceBalance = 0;
    }

    month.totalFixedMeal = monthFixedMeal?.total;

    month.mealRate = (month?.totalMealCost / month?.totalFixedMeal).toFixed(2);

    await month.save();
  } catch (error) {
    return error;
  }
};

/**
 * calculation all user data in database
 * @param {User._id} userId mess member user id
 * @param {object} month  active month object
 * @param {Number} totalMember  mess total member
 */

exports.userMonthCal = async (userId, month) => {
  try {
    //  calculate

    // 1. calculate active user month  data cash /rice /
    const userDataSum = await MonthMemberData.aggregate([
      {
        $match: {
          $and: [
            { monthId: new mongoose.Types.ObjectId(month._id) },
            { userId: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    const userData = {};
    userDataSum.forEach((userDataItem) => {
      userData[userDataItem._id] = userDataItem.total;
    });

    // 2. calculate user Meal
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
    // ****3 find user month data ****
    const userMonthData = await UserMonthData.findOne({
      $and: [{ userId: userId }, { monthId: month._id }],
    });

    // 4. update userMonthData Model

    const cash = userData?.cash || 0;
    const rice = userData?.rice || 0;
    const extraRice = userData?.extraRice || 0;
    const guestMeal = userData?.guestMeal || 0;
    const extraCost = userData?.extraCost || 0;

    //5 set value this property
    userMonthData.totalMeal = meal?.total || 0;
    userMonthData.fixedMeal =
      userMonthData.totalMeal > month.fixedMeal
        ? userMonthData.totalMeal
        : month.fixedMeal;
    userMonthData.totalDeposit = cash;

    const addRich = await MonthMemberData.find({
      $and: [
        { messId: month.messId },
        { monthId: month._id },
        { type: 'rice' },
        { userId: userId },
      ],
    });
    if (addRich.length > 0) {
      userMonthData.totalDepositRice = rice;
      userMonthData.totalExtraRice = extraRice;

      userMonthData.riceBalance = rice - userMonthData.totalMeal - extraRice;
    } else {
      userMonthData.totalDepositRice = 0;
      userMonthData.totalExtraRice = 0;
      userMonthData.riceBalance = 0;
    }

    userMonthData.mealCost = (userMonthData.fixedMeal * month.mealRate).toFixed(
      2
    );
    userMonthData.totalGuestMealAmount = guestMeal;
    userMonthData.totalExtraCost = extraCost;
    userMonthData.otherCost = month.otherCostPerPerson.toFixed(2);
    userMonthData.totalCost = Math.round(
      userMonthData.mealCost +
        userMonthData.otherCost +
        userMonthData.totalGuestMealAmount +
        userMonthData.totalExtraCost
    );
    userMonthData.balance = (cash - userMonthData.totalCost).toFixed(2);

    // 6. save to database
    const data = await userMonthData.save();
    return data;
  } catch (error) {
    return error;
  }
};
