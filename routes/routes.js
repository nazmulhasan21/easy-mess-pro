const api = require('express').Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const messRoutes = require('./messRoutes');
const monthRoutes = require('./monthRoutes');
const costRoutes = require('./costRoutes');
const richRoutes = require('./richRoutes');
const cashRoutes = require('./cashRoutes');
const mealRoutes = require('./mealRoutes');
const guestRoutes = require('./guestRoutes');
const managerRoutes = require('./managerRoutes');
const subManagerRoutes = require('./subManagerRoutes');

api.use('/user-auth', authRoutes);
api.use('/user', userRoutes);
api.use('/mess', messRoutes);
api.use('/mess-manager', managerRoutes);
api.use('/month', monthRoutes);
api.use('/month-subManager', subManagerRoutes);
api.use('/month-cost/cost', costRoutes);
api.use('/month-rich/rich', richRoutes);
api.use('/month-cash/cash', cashRoutes);
api.use('/month-meal/meal', mealRoutes);
api.use('/month-guest/guest-meal', guestRoutes);

module.exports = api;
