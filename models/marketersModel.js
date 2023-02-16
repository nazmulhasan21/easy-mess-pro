const mongoose = require('mongoose');

const marketerSchema = mongoose.Schema(
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
    marketers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);
const Marketer = mongoose.model('Marketer', marketerSchema);
module.exports = Marketer;
