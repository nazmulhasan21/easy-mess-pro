const Cash = require('../models/cashModel');
const cash = require('./userCashOrRichController');

exports.getCashList = cash.getList(Cash);
exports.getCash = cash.getOne(Cash, 'cash');
exports.createCash = cash.createOne(Cash, 'cash');
exports.updateCash = cash.updateOne(Cash, 'cash');
exports.deleteCash = cash.deleteOne(Cash, 'cash');
