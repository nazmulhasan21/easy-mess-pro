const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    monthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Month',
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    title: {
      type: String,
    },
    description: String,
    date: {
      type: Date,
      required: true,
    },

    seen: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);
const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
