// node modules
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Dhaka');
const { validationResult } = require('express-validator');

// all Models

const Month = require('../../models/monthModel');
const Marketer = require('../../models/marketersModel');
const MarketerExchange = require('../../models/marketersExchangeModel');

// all Controllers

// all utils
const AppError = require('../../utils/appError');
const APIFeatures = require('../../utils/apiFeatures');
const User = require('../../models/userModel');
const Notification = require('../../models/notificationsModel');
const {
  pushNotificationMultiple,
  pushNotification,
} = require('../../utils/push-notification');
const {
  getMessMemberFCMTokens,
  getMessManagerSubFCMTokens,
} = require('../../utils/fun');

// get cost one
exports.getMarketers = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. find cost
    const doc = await Marketer.findOne({
      $and: [{ _id: req.params.id }, { messId: user.messId }],
    })
      .populate('marketers', 'name avatar role')
      .select('marketer name avatar role date');
    if (!doc)
      return next(
        new AppError(404, 'marketers', 'কোন বাজারকারী  খুজে পাওয়া যায়নি')
      );

    // 2. send res
    res.status(200).json({
      status: 'success',
      message: 'বাজারকারী খুজে পাওয়া গিয়েছে।',
      doc,
    });
  } catch (error) {
    next(error);
  }
};

// get All Marketers list active month
exports.getMarketersList = async (req, res, next) => {
  try {
    const { user, query } = req;

    const { userId, date } = query;

    // 1. find active month
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!activeMonth)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি।')
      );
    // filter some query
    //1. date filter
    const dateFilter = date
      ? {
          date: {
            $gte: moment(date).startOf('day'),
            $lte: moment(date).endOf('day'),
          },
        }
      : {};

    //2. userId filter
    const userIdFilter = userId ? { marketers: userId } : {};
    // find query
    const findQuery = {
      $and: [
        { monthId: activeMonth?._id },
        { messId: user?.messId },
        dateFilter,
        userIdFilter,
      ],
    };
    // 2. get all cost in active month
    const features = new APIFeatures(
      Marketer.find(findQuery)
        .populate('marketers', 'name avatar role')
        .select('monthId date marketers name avatar role')
        .sort({ date: 1 }),
      req.query
    );
    const doc = async () => {
      const data = await features.query;
      return data.map((item) => {
        return {
          _id: item?._id,
          date: item?.date,
          marketers: item?.marketers,
        };
      });
    };

    const results = await Marketer.countDocuments(findQuery);
    // 3. send res
    res.status(200).json({
      status: 'success',
      results: results,
      marketers: await doc(),
    });
  } catch (error) {
    next(error);
  }
};

exports.createMarketers = async (req, res, next) => {
  try {
    const { user } = req;
    const { date } = req.body;

    const marketersId = req.body.marketers || [];
    const { createAuto } = req.query;
    const marketDays = Number(req.query.marketDays) || '';

    // 1. find active month
    const month = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!month)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি।')
      );
    // if crate marketers list auto
    if (createAuto) {
      if (!marketDays)
        return next(
          new AppError(402, 'market Days', 'একটি বাজার কত দিনের তা  লিখুন')
        );
      // find old marketers
      const deleteOldMarketers = await Marketer.deleteMany({
        $and: [{ monthId: month?._id }, { messId: user?.messId }],
      });

      if (deleteOldMarketers) {
        const monthName = moment(month?.date).format('MMM');
        const startDate = moment().month(monthName).startOf('month');
        const endOfMonth = moment()
          .month(monthName)
          .endOf('month')
          .format('DD');

        for (let i = 0; i < endOfMonth; i += marketDays) {
          let marketDate = moment(startDate).add(i, 'days').format();
          console.log(marketDate);

          // 3. create Marketers list
          var marketersOne = await Marketer.create({
            messId: user?.messId,
            monthId: month?._id,
            marketers: [],
            date: marketDate,
          });
        }
        res.status(201).json({
          status: 'success',
          message: 'সফলভাবে বাজারের তালিকা তৈরি করা হয়েছে।',
        });
      }
    } else {
      // create marketers for one by one..
      if (!date) return next(new AppError(402, 'date', 'তারিখ নির্বাচন করুন।'));
      // create marketer list by one

      //2 only add this month date
      const isMonthDate = moment(month?.date).isSame(date, 'month');
      if (!isMonthDate)
        return next(
          new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
        );
      const findOldMarketers = await Marketer.findOne({
        $and: [
          { messId: user?.messId },
          { monthId: month?._id },
          {
            date: {
              $gte: moment(date).startOf('day'),
              $lte: moment(date).endOf('day'),
            },
          },
        ],
      });
      if (findOldMarketers) {
        return next(
          new AppError(
            402,
            'date',
            `আপনার ${moment(date).format(
              'DD/MM/YY'
            )} তারিখে একটি বাজার আছে, অনুগ্রহ  করে নতুন তারিখ নির্বাচন করুন।`
          )
        );
      } else {
        const isSame = marketersId[0] === marketersId[1] ? true : false;
        if (isSame) {
          return next(
            new AppError(
              402,
              'same',
              'আপনি ভিন্ন দুইজন বাজারকারী নির্বাচন করুন।'
            )
          );
        } else {
          // 3. create Marketers list
          var marketers = await Marketer.create({
            messId: user.messId,
            monthId: month._id,
            marketers: marketersId,
            date: date,
          });

          if (marketersId.length > 0) {
            marketersId?.map(async (marketersId) => {
              const marker = await User.findById(marketersId).select(
                'FCMToken'
              );

              if (marker?.FCMToken) {
                const pushBody = `আপনার বাজার দেওয়া হয়েছে:`;
                const pushTitle = `${marker.name}  আপনার বাজার তারিখ: ${moment(
                  date
                ).format('DD/MM/YYYY')}`;

                await pushNotification(pushTitle, pushBody, marker?.FCMToken);
              }
            });
          }
        }
      }

      res.status(201).json({
        status: 'success',
        message: 'সফলভাবে বাজারের তালিকা তৈরি করা হয়েছে।',
        marketers: marketers,
      });
    }

    // const date = new Date(req.body.date);

    // // Push Notifications with Firebase
    // const pushTitle = 'খরচ যোগ করা হয়েছে';
    // const body = `${title}=${amount}/=,তারিখ:${moment(date).format(
    //   'DD/MM/YY'
    // )}`;
    // const FCMTokens = await getMessMemberFCMTokens(user.messId);
    // if (FCMTokens) {
    //   await pushNotificationMultiple(pushTitle, body, FCMTokens);
    // }

    // await Notification.create({
    //   monthId: month._id,
    //   title: pushTitle,
    //   description: body,
    //   date: cost.createdAt,
    // });
    // 3. send res
  } catch (error) {
    next(error);
  }
};

exports.marketerJoin = async (req, res, next) => {
  try {
    const { user } = req;

    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const marketers = await Marketer.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });
    // 2. Not found any cost
    if (!marketers || !activeMonth)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারীদের আপডেট করা যাবে না')
      );

    if (marketers.marketers.length == 2)
      return next(
        new AppError(403, 'join', `আগে থেকেই দুইজন বাজারকারী বিদ্যমান আছে।`)
      );

    if (
      marketers.marketers.find(
        (market) => JSON.stringify(market) === JSON.stringify(user._id)
      )
    )
      return next(
        new AppError(402, 'marketers', `আপনি আগে থেকেই এই তালিকায় আছেন।`)
      );

    marketers.marketers.push(user._id);
    await marketers.save();

    const pushTitle = 'বাজার কারী যুক্ত হয়েছেন';
    const pushBody = `তারিখ:${moment(marketers.date).format('DD/MM/YY')}, নাম:${
      user.name
    }  বাজারে যুক্ত হয়েছেন।`;

    // Push Notifications with Firebase

    const FCMTokens = await getMessManagerSubFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   monthId: cost.messId,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: cost.updatedAt,
    // });
    // 3. send res
    res.status(200).json({
      status: 'success',
      message: 'সফল ভাবে আপনি বাজারে যোগদান করেছেন।',
    });
  } catch (error) {
    next(error);
  }
};

exports.marketerLeave = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    if (!activeMonth)
      return next(
        new AppError(404, 'month', 'আপনার সক্রিয় মাস খুঁজে পাওয়া যায়নি।')
      );
    const marketers = await Marketer.findOne({
      $and: [
        { _id: req.params.id },
        { monthId: activeMonth._id },
        { marketers: user._id },
      ],
    });
    // 2. Not found any cost
    if (!marketers || !activeMonth)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারি আগে থেকেই লীভ নিয়েছেন।')
      );
    if (
      marketers.marketers.find(
        (market) => JSON.stringify(market) === JSON.stringify(user._id)
      )
    ) {
      marketers.marketers.pull(user._id);
      await marketers.save();
    }

    const pushTitle = 'বাজার কারী লীভ নিয়েছেন।';
    const pushBody = ` তারিখ:${moment(marketers.date).format(
      'DD/MM/YY'
    )} নাম: ${user.name}  বাজার থেকে লীভ গ্রহন করেছেন।`;

    // Push Notifications with Firebase

    const FCMTokens = await getMessManagerSubFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   monthId: cost.messId,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: cost.updatedAt,
    // });
    // 3. send res
    res.status(200).json({
      status: 'success',
      message: 'সফল ভাবে আপনি বাজার থেকে লীভ গ্রহন করেছেন।',
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMarketers = async (req, res, next) => {
  try {
    const { user, body } = req;

    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    // 1. create new cost body in new data

    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const marketers = await Marketer.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    });
    // 2. Not found any cost
    if (!marketers || !activeMonth)
      return next(
        new AppError(404, 'marketers', 'এই বাজারকারিদের আপডেট করা যাবে না')
      );
    // only add this month date
    const isMonthDate = moment(activeMonth.date).isSame(
      body?.date || marketers.date,
      'month'
    );
    if (!isMonthDate)
      return next(
        new AppError(402, 'date', 'আপনার সক্রিয় মাসের তারিখ নির্বাচন করুন')
      );
    // find old marketers new date
    // if (body.date) {
    //   const oldMarketers = await Marketer.find({
    //     $and: [
    //       { _id: req.params.id },
    //       {
    //         date: {
    //           $gte: moment(body.date).startOf('day'),
    //           $lte: moment(body.date).endOf('day'),
    //         },
    //       },
    //     ],
    //   });
    //   if (oldMarketers)
    //     return next(
    //       new AppError(
    //         402,
    //         `আপনার ${moment(body.date).format(
    //           'DD/MM/YY'
    //         )} তারিখের বাজার আগে থেকেই আছেন।`
    //       )
    //     );
    // }

    // find array
    const marketersId = body.marketers.filter(Boolean);
    const isSame = marketersId[0] === marketersId[1] ? true : false;
    if (isSame)
      return next(
        new AppError(402, 'same', 'আপনি ভিন্ন দুইজন বাজারকারী নির্বাচন করুন।')
      );

    const newMarketers = {
      date: body.date,
      marketers: marketersId || marketers.marketers,
    };
    const doc = await Marketer.findByIdAndUpdate(req.params.id, newMarketers, {
      new: true,
      runValidators: true,
    });
    // Push Notifications with Firebase
    const pushTitle = 'বাজার পরিবর্তন করা হয়েছে';
    const pushBody = `তারিখ:${moment(marketers.date).format(
      'DD/MM/YY'
    )}  থেকে তারিখ:${moment(newMarketers.date || marketers.date).format(
      'DD/MM/YY'
    )} পরিবর্তন করা হলো।`;

    doc?.marketers?.map(async (marketersId) => {
      const marker = await User.findById(marketersId).select('FCMToken');

      if (marker?.FCMToken) {
        await pushNotification(pushTitle, pushBody, marker?.FCMToken);
      }
    });

    const FCMTokens = await getMessManagerSubFCMTokens(user.messId);
    if (FCMTokens) {
      await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
    }

    // await Notification.create({
    //   monthId: cost.messId,
    //   title: pushTitle,
    //   description: pushBody,
    //   date: cost.updatedAt,
    // });
    // 3. send res
    res.status(200).json({
      status: 'success',
      message: 'বাজারকারীদের সফল ভাবে পরির্বতন হয়েছে।',
      doc,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteMarketers = async (req, res, next) => {
  try {
    const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));

    // 1. found cost and active month and addBy user
    const activeMonth = await Month.findOne({
      $and: [{ messId: user.messId }, { active: true }],
    });
    const marketers = await Marketer.findOne({
      $and: [{ _id: req.params.id }, { monthId: activeMonth._id }],
    }).populate('marketers', 'name');

    // 2. Not found any cost or active Month or add by user

    if (!marketers || !activeMonth)
      return next(new AppError(404, 'marketers', 'এটি ‍ডিলেট করতে পারবেন না।'));

    // 3. delete Cost
    const delateMarketers = await Marketer.findByIdAndDelete(req.params.id);
    if (delateMarketers) {
      // Push Notifications with Firebase
      const pushTitle = 'বাজারকারীদের ডিলেট করা হয়েছে';
      const pushBody = `তারিখ:${moment(marketers.date).format(
        'DD/MM/YY'
      )} বাজারকারীদের  ডিলেট করা হলো।`;

      delateMarketers.marketers?.map(async (marketersId) => {
        const marker = await User.findById(marketersId).select('FCMToken');

        if (marker?.FCMToken) {
          await pushNotification(pushTitle, pushBody, marker?.FCMToken);
        }
      });

      const FCMTokens = await getMessManagerSubFCMTokens(user.messId);
      if (FCMTokens) {
        await pushNotificationMultiple(pushTitle, pushBody, FCMTokens);
      }

      // await Notification.create({
      //   monthId: cost.messId,
      //   title: pushTitle,
      //   description: pushBody,
      //   date: cost.updatedAt,
      // });
      res.status(200).json({
        status: 'success',
        message: 'বাজারকারীদের সফল ভাবে ডিলেট হয়েছে।',
      });
    }
  } catch (error) {
    next(error);
  }
};
