const api = require('express').Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const messRoutes = require('./messRoutes');
const monthRoutes = require('./monthRoutes');
const costRoutes = require('./costRoutes');
const mealRoutes = require('./mealRoutes');
const managerRoutes = require('./managerRoutes');
const subManagerRoutes = require('./subManagerRoutes');
const monthMemberDataRoutes = require('./monthMemberDataRoutes');
const marketersRoutes = require('./marketers/marketersRoutes');
const superAdminMonthRoutes = require('./superAdminRoute/superAdminMonthRoutes');
const superAdminUserDataRoutes = require('./superAdminRoute/superAdminUserDataRoutes');

api.use('/user-auth', authRoutes);
api.use('/user', userRoutes);
api.use('/mess', messRoutes);
api.use('/mess-manager', managerRoutes);
api.use('/month', monthRoutes);
api.use('/month-sub-manager', subManagerRoutes);
api.use('/month-marketers', marketersRoutes);
api.use('/month-cost', costRoutes);
api.use('/month-meal', mealRoutes);
api.use('/month-member-data', monthMemberDataRoutes);
api.use('/super-admin-month', superAdminMonthRoutes);
api.use('/super-admin-user-data', superAdminUserDataRoutes);

module.exports = api;
