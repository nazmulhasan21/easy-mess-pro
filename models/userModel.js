const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { UserMonthData } = require('./userMonthDataModel');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please fill your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    phone: {
      type: String, // do not change this type number.
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Please fill your name'],
    },
    institution: {
      type: String,
      default: 'NOT_SET_YET',
    },
    address: {
      type: String,
      default: 'NOT_SET_YET',
    },
    avatar: {
      type: String,
      default:
        'https://res.cloudinary.com/messmanager/image/upload/v1660195350/mess_manager_profile_vector-01_wiymk3.png',
    },

    role: {
      type: String,
      enum: ['border', 'manager', 'admin', 'subManager'],
      default: 'border',
    },
    rollNo: {
      type: Number,
    },
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
    },
    // userMonthData: [UserMonthData],
    // userMonthData: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'UserMonthData',
    //   },
    // ],
    months: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Month',
      },
    ],
    FCMToken: {
      type: String,
      select: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },
    isMessAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// encrypt the password using 'bcryptjs'
// Mongoose -> Document Middleware
userSchema.pre('save', async function (next) {
  // check the password if it is modified
  if (!this.isModified('password')) {
    return next();
  }
  // Hashing the password
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  // this.passwordConfirm = undefined;
  next();
});

// This is Instance Method that is gonna be available on all documents in a certain collection
userSchema.methods.correctPassword = async function (
  typedPassword,
  originalPassword
) {
  return await bcrypt.compare(typedPassword, originalPassword);
};
const User = mongoose.model('User', userSchema);
module.exports = User;
