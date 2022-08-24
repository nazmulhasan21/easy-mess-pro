const Rice = require('../models/riceModel');
const rice = require('./userCashOrRiceController');

exports.getRiceList = rice.getList(Rice);
exports.getRice = rice.getOne(Rice, 'rice');
exports.createRice = rice.createOne(Rice, 'rice');
exports.updateRice = rice.updateOne(Rice, 'rice');
exports.deleteRice = rice.deleteOne(Rice, 'rice');
