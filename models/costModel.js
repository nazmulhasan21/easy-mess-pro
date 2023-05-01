const mongoose = require('mongoose');

const costSchema = mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
      required: true,
    },
    monthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Month',
      required: true,
    },
    addBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    editBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['bigCost', 'smallCost', 'otherCost'],
      required: true,
    },
    title: {
      type: String,
    },
    amount: {
      type: Number,
      default: 0,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);
const Cost = mongoose.model('Cost', costSchema);
module.exports = Cost;
