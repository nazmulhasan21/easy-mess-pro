const mongoose = require('mongoose');

const userMonthDataSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // userName: { type: String },
    monthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Month',
    },
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
    },
    userName: {
      type: String,
    },
    totalDeposit: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    mealCost: {
      type: Number,
      default: 0.0,
    },
    otherCost: {
      type: Number,
      default: 0.0,
    },
    totalGuestMealAmount: {
      type: Number,
      default: 0,
    },
    totalDepostiRice: {
      type: Number,
      default: 0.0,
    },
    totalExtraRice: {
      type: Number,
      default: 0.0,
    },
    riceBalance: {
      type: Number,
      default: 0.0,
    },
    totalMeal: {
      type: Number,
      default: 1,
    },
    fixedMeal: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

const UserMonthData = mongoose.model('UserMonthData', userMonthDataSchema);

module.exports = UserMonthData;
module.exports.UserMonthData = userMonthDataSchema;
