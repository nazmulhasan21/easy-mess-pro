const mongoose = require('mongoose');

const otpCodeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please fill your email'],
    },
    code: {
      type: Number,
      select: false,
    },
    expiredAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const User = mongoose.model('OtpCode', otpCodeSchema);
module.exports = User;
