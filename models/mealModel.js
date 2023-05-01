const mongoose = require('mongoose');

const mealSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
    },
    monthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Month',
    },
    addBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    editBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    breakfast: { type: Number, default: 0 },
    lunch: { type: Number, default: 0 },
    dinner: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    date: { type: Date },
  },
  { timestamps: true }
);
const Meal = mongoose.model('Meal', mealSchema);
module.exports = Meal;
