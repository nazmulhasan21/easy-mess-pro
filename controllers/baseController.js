const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const mongoose = require('mongoose');
const User = require('../models/userModel');

exports.deleteOne = (Model, model) => async (req, res, next) => {
  try {
    const doc = await Model.findByIdAndDelete(req.params._id);
    if (!doc) {
      return next(
        new AppError(404, model, `এই আইডির সাথে পাওয়া যায়নি`, 'fail')
      );
    }
  } catch (error) {
    next(error);
  }
};

exports.updateOne = (Model, model) => async (req, res, next) => {
  try {
    const doc = await Model.findByIdAndUpdate(req.params, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc)
      return next(new AppError(404, model, `এই আইডির সাথে পাওয়া যায়নি`));
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createOne = (Model, model) => async (req, res, next) => {
  try {
    const doc = await Model.create(req.body);
    if (!doc) return next(new AppError(400, model, `${model} create fail`));
    res.status(201).json({
      status: 'success',
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getOne = (Model, model) => async (req, res, next) => {
  try {
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError(404, model, `খুজে পাওয়া যায়নি`));
    }
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};
// exports.getOneById = (Model, model, query) => async (req, res, next) => {
//   try {
//     const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
//     if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
//     const doc = await Model.findOne(query);
//     if (!doc) {
//       return next(new AppError(404, model, `${model} not found`));
//     }
//     res.status(200).json({
//       status: 'success',
//       data: {
//         doc,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

exports.getAll = (Model) => async (req, res, next) => {
  try {
    const messId = req.user.messId;
    // name filter
    const name = req.query.name || '';
    const nameFilter = name ? { name: { $regex: name, $options: 'i' } } : {};
    // email filter
    const email = req.query.email || '';
    const emailFilter = email
      ? { email: { $regex: email, $options: 'i' } }
      : {};
    // phone filter
    const phone = req.body.phone || '';
    const phoneFilter = phone
      ? { phone: { $regex: phone, $options: 'i' } }
      : {};
    // findQuery
    const findQuery = {
      $and: [{ messId: messId }, nameFilter, emailFilter, phoneFilter],
    };
    const features = new APIFeatures(
      Model.find(findQuery).sort({ rollNo: 1 }),
      req.query
    );
    const doc = await features.query;
    const results = await Model.countDocuments(findQuery);
    res.status(200).json({
      status: 'success',
      results,
      data: {
        data: doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.fineOne = (Model, model) => async (req, res, next) => {
  try {
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    const doc = await Model.findOne();
    if (!doc) {
      return next(new AppError(404, model, `খুজে পাওয়া যায়নি`));
    }
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};
