const mongoose = require('mongoose');

const messSchema = mongoose.Schema(
  {
    messName: {
      type: String,
      required: true,
    },
    allMember: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    totalBorder: {
      type: Number,
      default: 1,
    },
    month: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Month',
      },
    ],
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);
const Mess = mongoose.model('Mess', messSchema);
module.exports = Mess;
