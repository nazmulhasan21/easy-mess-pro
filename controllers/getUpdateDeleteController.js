// node modules
const mongoose = require('mongoose');
const _ = require('lodash');

// all Models
const Month = require('../models/monthModel');

// all utils
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Dhaka');
const User = require('../models/userModel');
const {
  pushNotificationMultiple,
  pushNotification,
} = require('../utils/push-notification');
const { getMessMemberFCMTokens } = require('../utils/fun');
const Notification = require('../models/notificationsModel');

// get cost one

/**
 *
 * @param {ModelName} Model
 * @param {modelNameString} model
 * @returns {object}
 */
exports.getOne = (Model) => async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find cost
    const doc = await Model.findOne({
      $and: [{ _id: req.params.id }, { messId: user.messId }],
    }).populate('addBy editBy userId', 'name avatar role');
    if (!doc) return next(new AppError(404, 'data', `কিছু খুজে পাওয়া যায়নি।`));
    doc.userName = undefined;
    // 2. send res
    res.status(200).json({
      status: 'success',
      message: `সফল ভাবে পাওয়া হয়েছে।`,
      data: {
        doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 *
 * @param {ModelName} Model
 * @returns {Array}
 */
// get All Cost active month
exports.getList = (Model) => async (req, res, next) => {
  try {
    const { user, query } = req;
    const { startDate, endDate, day } = query;
    // filter
    // 1. filter in date
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {
        date: {
          $gte: moment(startDate).startOf('day'),
          $lte: moment(endDate).endOf('day'),
        },
      };
    } else if (day) {
      dateFilter = {
        date: {
          $gte: moment(day).startOf('day'),
          $lte: moment(day).endOf('day'),
        },
      };
    }
    //2. amount filter
    const amount = req.query.amount || '';
    const amountFilter = amount
      ? {
          amount: {
            $gte: amount.split('-')[0],
            $lte: amount.split('-')[1],
          },
        }
      : {};

    //3. type filter
    const type = req.query.type || '';
    const typeFilter = type ? { type } : {};

    ///4. user filter
    const userId = req.query.userId || '';
    const userIdFilter = userId ? { userId } : {};

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    /// find query
    const findQuery = {
      $and: [
        { monthId: activeMonth._id },
        dateFilter,
        amountFilter,
        typeFilter,
        userIdFilter,
      ],
    };
    // 2. get all cost in active month
    const features = new APIFeatures(
      Model.find(findQuery)
        .populate('addBy editBy userId', 'name avatar role')
        .select('userId type amount addBy editBy date createdAt updatedAt')
        .sort({ createdAt: -1 }),
      req.query
    );
    const findDoc = async () => {
      const data = await features.query;
      return data.map((item) => {
        return {
          _id: item._id,
          userId: item.userId,
          type: item.type,
          amount: item.amount,
          addBy: item.addBy,
          editBy: item.editBy,
          date: item.date,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });
    };
    const doc = await findDoc();
    const total = _.sumBy(doc, 'amount');
    const results = await Model.countDocuments(findQuery);

    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      data: {
        data: doc,
      },
      total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 *
 * @param {ModelName} Model
 * @param {modelNameString} model
 * @returns {object}
 */

/**
 *
 * @param {ModelName} Model
 * @param {modelNameString} model
 * @returns {object}
 */

exports.updateOne = (Model, model) => async (req, res, next) => {
  try {
    const { user, body } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!activeMonth)
      return next(new AppError(404, 'month', `কোন সক্রিয় মাস নেই`));

    let newDoc = {};
    const doc = await Model.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });
    if (!doc) return next(new AppError(404, model, 'Not found with this id'));
    // only add this month date
    const isMonthDate = moment(activeMonth.date).isSame(
      body?.date || doc?.date,
      'month'
    );
    if (!isMonthDate)
      return next(
        new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
      );

    const member = await User.findById(doc.userId).select('name FCMToken');
    let pushTitle;
    let pushBody;
    // if update any one meal  run this if function
    if (model == 'meal') {
      const breakfast =
        body?.breakfast == 0 ? 0 : body?.breakfast || doc?.breakfast;
      const lunch = body?.lunch == 0 ? 0 : body?.lunch || doc?.lunch;
      const dinner = body?.dinner == 0 ? 0 : body?.dinner || doc?.dinner;
      const total = breakfast + lunch + dinner;
      newDoc = {
        breakfast,
        lunch,
        dinner,
        total,
        editBy: user._id,
      };

      pushTitle = `${member.name} এর মিল পরিবর্তন করা হয়েছে`;
      pushBody = `মোট মিল=${total}/= তারিখ:${moment(doc.date).format(
        'DD/MM/YY'
      )}`;

      if (member?.FCMToken) {
        await pushNotification(pushTitle, pushBody, member?.FCMToken);
      }
    } else {
      newDoc = {
        ...body,
        editBy: user._id,
      };
      pushTitle = `${member.name} এর ${doc.type} পরিবর্তন করা হয়েছে`;
      pushBody = `${doc.type}=${body.amount || doc.amount}/= তারিখ:${moment(
        body.date || doc.date
      ).format('DD/MM/YY')}`;

      const FCMTokens = await getMessMemberFCMTokens(user.messId);
      if (FCMTokens) {
        await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
      }
    }

    const upDoc = await Model.findByIdAndUpdate(req.params.id, newDoc, {
      new: true,
      runValidators: true,
    });
    // Push Notifications with Firebase

    // await Notification.create({
    //   monthId: activeMonth._id,
    //   user: doc.userId,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: doc.updatedAt,
    // });

    // 3. send res
    return res.status(200).json({
      status: 'success',
      message: 'সফল ভাবে পরিবর্তন করা হয়েছে',
      data: {
        upDoc,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 *
 * @param {ModelName} Model
 * @param {modelNameString} model
 * @returns {Message}
 */
exports.deleteOne = (Model, model) => async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // 1. found cost and active month and addBy user
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    }).select('_id');
    const doc = await Model.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });
    if (!doc)
      return next(new AppError(404, model, `এটি আগে থেকে ডিলেট হয়ে গিয়েছে।`));
    const addBy = JSON.stringify(doc?.addBy) === JSON.stringify(user._id);
    // 2. Not found any cost or active Month or add by user
    // let type = '';
    // switch (doc?.type) {
    //   case 'cash':
    //     type = 'টাকা';
    //     break;
    //   case 'rice':
    //     type = 'চাউল';
    //     break;
    //   case 'extraRice':
    //     type = 'অতিরিক্ত চাউল';
    //     break;
    //   case 'guestMeal':
    //     type = 'গেষ্ট মিলের টাকা';
    // }

    const typeMessage = () => {
      switch (doc?.type) {
        case 'cash':
          return 'টাকা';
        case 'rice':
          return 'চাউল';
        case 'extraRice':
          return 'অতিরিক্ত চাউল';
        case 'guestMeal':
          return 'গেষ্ট মিলের টাকা';
      }
    };

    const type = typeMessage();

    if (!activeMonth || !addBy)
      return next(
        new AppError(
          404,
          type,
          `আপনি যে ${type} এড করেছেন শুধু মাত্র সেই ${type} ‍ডিলেট করতে পারবেন`
        )
      );

    // 3. delete Cost
    await Model.findByIdAndDelete(req.params.id);

    // Push Notifications with Firebase

    const member = await User.findById(doc?.userId).select('name FCMToken');
    const pushTitle = `${member.name} এর ${typeMessage()} ডিলেট করা হয়েছে`;
    const pushBody = `${type} = ${doc?.amount}/= তারিখ:${moment(
      doc?.date
    ).format('DD/MM/YY')} ডিলেট করা হয়েছে`;

    if (member && member.FCMToken) {
      const FCMToken = member.FCMToken;
      await pushNotification(pushTitle, pushBody, FCMToken);
    }

    // await Notification.create({
    //   monthId: activeMonth._id,
    //   user: doc.userId,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: doc.createdAt,
    // });

    res.status(200).json({
      status: 'success',
      message: ` ${type} সফল ভাবে ডিলেট হয়েছে।`,
    });
  } catch (error) {
    next(error);
  }
};
