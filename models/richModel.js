const mongoose = require('mongoose');

const richSchema = mongoose.Schema(
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
const Rich = mongoose.model('Rich', richSchema);
module.exports = Rich;
