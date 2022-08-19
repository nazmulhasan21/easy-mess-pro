const ExtraRich = require('../models/extraRichModel');
const extraRich = require('./userCashOrRichController');

exports.getExtraRichList = extraRich.getList(ExtraRich);
exports.getExtraRich = extraRich.getOne(ExtraRich, 'extraRich');
exports.createExtraRich = extraRich.createOne(ExtraRich, 'extraRich');
exports.updateExtraRich = extraRich.updateOne(ExtraRich, 'extraRich');
exports.deleteExtraRich = extraRich.deleteOne(ExtraRich, 'extraRich');
