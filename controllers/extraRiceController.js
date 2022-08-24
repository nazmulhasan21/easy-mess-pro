const ExtraRice = require('../models/extraRiceModel');
const extraRice = require('./userCashOrRiceController');

exports.getExtraRiceList = extraRice.getList(ExtraRice);
exports.getExtraRice = extraRice.getOne(ExtraRice, 'extraRice');
exports.createExtraRice = extraRice.createOne(ExtraRice, 'extraRice');
exports.updateExtraRice = extraRice.updateOne(ExtraRice, 'extraRice');
exports.deleteExtraRice = extraRice.deleteOne(ExtraRice, 'extraRice');
