const mongoose = require('mongoose');

const marketerExchangeSchema = mongoose.Schema(
  {
    monthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Month',
      required: true,
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
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
const Marketer = mongoose.model('MarketerExchange', marketerExchangeSchema);
module.exports = Marketer;
