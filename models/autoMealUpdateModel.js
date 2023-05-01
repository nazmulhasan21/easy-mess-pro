const mongoose = require('mongoose');

const autoMealUpdateSchema = mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
    },
    monthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Month',
    },

    breakfast: { type: Boolean, default: true },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false },
    tomorrow: { type: Boolean, default: false },
    date: { type: Date },
  },
  { timestamps: true }
);
const AutoMealUpdate = mongoose.model('AutoMealUpdate', autoMealUpdateSchema);
module.exports = AutoMealUpdate;
