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
    monthTitle: {
      type: String,
    },
    userMonthData: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserMonthData',
        select: false,
      },
    ],
    cashs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cash',
        select: false,
      },
    ],
    richs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rich',
        select: false,
      },
    ],
    meals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meal',
        select: false,
      },
    ],
    guestMeals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GuestMeal',
        select: false,
      },
    ],
    costs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cost',
        select: false,
      },
    ],
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
    totalRich: {
      type: Number,
      default: 0,
    },
    richBalance: {
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
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  { timestamps: true }
);
const Month = mongoose.model('Month', monthSchema);
module.exports = Month;
