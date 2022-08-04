const Rich = require('../models/richModel');
const rich = require('./userCashOrRichController');

exports.getRichList = rich.getList(Rich);
exports.getRich = rich.getOne(Rich, 'rich');
exports.createRich = rich.createOne(Rich, 'rich');
exports.updateRich = rich.updateOne(Rich, 'rich');
exports.deleteRich = rich.deleteOne(Rich, 'rich');
