// node modules
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment');

// all Models

const Month = require('../../models/monthModel');

// all Controllers

// all utils
const AppError = require('../../utils/appError');
const User = require('../../models/userModel');

const {
  pushNotificationMultiple,
  pushNotification,
} = require('../../utils/push-notification');

const Mess = require('../../models/messModel');
const UserMonthData = require('../../models/userMonthDataModel');
const { monthCal, userMonthCal } = require('../../utils/calculation');
const Meal = require('../../models/mealModel');
const Cost = require('../../models/costModel');
const MonthMemberData = require('../../models/monthMemberDataModel');

/// delete cost month member data

exports.deleteOne = async (req, res, next) => {
  try {
    // const { user } = req;
    const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!isValid) return next(new AppError(400, '_id', 'Id is not valid '));
    const model = req.query.type;
    let Model = MonthMemberData;
    if ((model = 'Cost')) {
      Model = Cost;
    }

    const doc = await Model.findOne({
      _id: req.params.id,
    });
    if (!doc)
      return next(new AppError(404, model, `এটি আগে থেকে ডিলেট হয়ে গিয়েছে।`));
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
    // 3. delete Cost
    await Model.findByIdAndDelete(req.params.id);
    const month = await Month.findById(doc.monthId);
    await monthCal(month);
    await month.save();

    const userData = await UserMonthData.find({
      $and: [{ messId: month.messId }, { monthId: month._id }],
    })
      .select('userId')
      .sort({ rollNo: 1 });
    userData.map(async (item) => {
      await userMonthCal(item.userId, month);
    });
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

// delete one date meal
// params = monthId
exports.deleteOndDayMeal = async (req, res, next) => {
  try {
    // const { user } = req;
    const day = req.query.day;
    if (day) {
      console.log(day);

      let dateFilter = {};
      dateFilter = {
        date: {
          $gte: moment(day).startOf('day'),
          $lte: moment(day).endOf('day'),
        },
      };
      const month = await Month.findById(req.params.monthId);

      const meals = await Meal.find({
        $and: [{ monthId: req.params.monthId }, dateFilter],
      });

      if (meals[0] == false) {
        return res.status(200).json({
          status: 'success',
          message: `${moment(day).format(
            'DD/MM/YYYY'
          )} এই তারিখে কোন মিল যোগ করা হয়নি।`,
          date: moment(day).format(),
        });
      }
      const deleteMeals = await Meal.deleteMany({
        $and: [{ monthId: req.params.monthId }, dateFilter],
      });
      await monthCal(month);
      await month.save();

      const userData = await UserMonthData.find({
        $and: [{ messId: month.messId }, { monthId: month._id }],
      })
        .select('userId')
        .sort({ rollNo: 1 });
      userData.map(async (item) => {
        await userMonthCal(item.userId, month);
      });
      res.status(200).json({
        status: 'success',
        deleteMeals,
      });
    } else {
      return next(new AppError(403, 'date', 'মিল এর তারিখ পাঠান'));
    }
  } catch (error) {
    next(error);
  }
};
