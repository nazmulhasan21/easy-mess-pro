const mongoose = require('mongoose');

// const dailyMealSchema = mongoose.Schema(
//   {
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     breakfast: { type: Number, default: 0 },
//     lunch: { type: Number, default: 0 },
//     dinner: { type: Number, default: 0 },
//     total: { type: Number, default: 0 },
//     date: { type: Date },
//   },
//   { timestamps: true }
// );

const monthSchema = mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    subManager: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    monthTitle: {
      type: String,
      require: [true, 'Please provide your month name'],
    },
    date: {
      type: Date,
      require: [true, 'Please provide date type'],
    },

    // After Array  for pdf
    userMonthData: {
      type: Array,
      select: false,
    },
    monthMemberData: {
      type: Array,
      select: false,
    },
    meals: {
      type: Array,
      select: false,
    },
    costs: {
      type: Array,
      select: false,
    },
    // user this create pdf
    totalDeposit: {
      type: Number,
      default: 0.0,
    },

    totalBigCost: {
      type: Number,
      default: 0,
    },
    totalSmallCost: {
      type: Number,
      default: 0,
    },
    totalGuestMealAmount: {
      type: Number,
      default: 0,
    },
    totalMealCost: {
      type: Number,
      default: 0,
    },
    totalOtherCost: {
      type: Number,
      default: 0.0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    totalRice: {
      type: Number,
      default: 0,
    },
    riceBalance: {
      type: Number,
      default: 0,
    },
    totalMeal: {
      type: Number,
      default: 1,
    },
    mealRate: {
      type: Number,
      default: 1,
    },
    otherCostPerPerson: {
      type: Number,
      default: 0.0,
    },
    fixedMeal: {
      type: Number,
      default: 1,
    },
    totalFixedMeal: {
      type: Number,
      default: 1,
    },
    autoMealUpdate: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
const Month = mongoose.model('Month', monthSchema);
module.exports = Month;
