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
    totalExtraCost: {
      type: Number,
      default: 0,
    },

    totalDepositRice: {
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
      default: 0,
    },
    fixedMeal: {
      type: Number,
      default: 1,
    },
    rollNo: {
      type: Number,
      required: [true, 'Please fill border Roll no'],
      unique: true,
    },
  },
  { timestamps: true }
);

const UserMonthData = mongoose.model('UserMonthData', userMonthDataSchema);

module.exports = UserMonthData;
module.exports.UserMonthData = userMonthDataSchema;
