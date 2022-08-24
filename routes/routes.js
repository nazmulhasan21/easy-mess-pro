const api = require('express').Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const messRoutes = require('./messRoutes');
const monthRoutes = require('./monthRoutes');
const costRoutes = require('./costRoutes');
const riceRoutes = require('./riceRoutes');
const cashRoutes = require('./cashRoutes');
const mealRoutes = require('./mealRoutes');
const guestRoutes = require('./guestRoutes');
const extraRiceRoutes = require('./extraRiceRoutes');
const managerRoutes = require('./managerRoutes');
const subManagerRoutes = require('./subManagerRoutes');

api.use('/user-auth', authRoutes);
api.use('/user', userRoutes);
api.use('/mess', messRoutes);
api.use('/mess-manager', managerRoutes);
api.use('/month', monthRoutes);
api.use('/month-subManager', subManagerRoutes);
api.use('/month-cost/cost', costRoutes);
api.use('/month-rice/rice', riceRoutes);
api.use('/month-cash/cash', cashRoutes);
api.use('/month-meal/meal', mealRoutes);
api.use('/month-guest/guest-meal', guestRoutes);
api.use('/month-extra/extra-rice', extraRiceRoutes);

module.exports = api;
