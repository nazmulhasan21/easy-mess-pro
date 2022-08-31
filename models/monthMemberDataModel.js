const mongoose = require('mongoose');

const monthMemberDataSchema = mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
    },
    monthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Month',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    addBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    editBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['cash', 'rice', 'extraRice', 'guestMeal', 'extraCost'],
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
    },
  },
  { timestamps: true }
);
const MonthMemberData = mongoose.model(
  'MonthMemberData',
  monthMemberDataSchema
);
module.exports = MonthMemberData;
