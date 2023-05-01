const mongoose = require('mongoose');

const marketerExchangeSchema = mongoose.Schema(
  {
    monthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Month',
      required: true,
    },
    marketerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Marketer',
    },
    marketersExchangeSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    marketersExchangeReceiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    date: {
      type: Date,
      required: true,
    },
    exchangeMarketerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Marketer',
    },
    status: {
      type: String,
      enum: ['pending', 'accept', 'reject'],
      default: 'pending',
    },
  },
  { timestamps: true }
);
const Marketer = mongoose.model('MarketerExchange', marketerExchangeSchema);
module.exports = Marketer;
