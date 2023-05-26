const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Dhaka');
const AutoMealUpdate = require('./models/autoMealUpdateModel');
const Marketer = require('./models/marketersModel');
const Meal = require('./models/mealModel');

const Mess = require('./models/messModel');
const Month = require('./models/monthModel');
const User = require('./models/userModel');
const {
  pushNotification,
  pushNotificationMultiple,
} = require('./utils/push-notification');
const async = require('hbs/lib/async');

// update meal
module.exports.updateMeal = async () => {
  // all mess
  const allMess = await Mess.find().select('allMember');

  // forEach work

  allMess.forEach(async (mess) => {
    // find active month
    const month = await Month.findOne({
      $and: [{ messId: mess?._id }, { active: true }, { autoMealUpdate: true }],
    });

    if (month) {
      const members = mess?.allMember;
      // all Member meals add in next day
      members.map(async (userId) => {
        const date = moment().add(1, 'days');
        const isMonthDate = moment(month.date).isSame(date, 'month');
        // find oldMeals
        if (isMonthDate) {
          const oldMeals = await Meal.find({
            $and: [
              { monthId: month?._id },
              {
                date: {
                  $gte: moment(date).startOf('day'),
                  $lte: moment(date).endOf('day'),
                },
              },
            ],
          });

          // if no add next day meal
          if (oldMeals?.length > 0) {
            console.log('Old meal is found so not new add this day meal');
          } else {
            // users Meals
            const userMeals = await Meal.find({
              $and: [{ userId: userId }, { monthId: month?._id }],
            });
            const lastDayMeal = userMeals[userMeals?.length - 1];
            const userMeal = lastDayMeal;
            // create new
            const meal = await Meal.create({
              userId: userId,
              breakfast: userMeal?.breakfast || 0,
              lunch: userMeal?.lunch || 0,
              dinner: userMeal?.dinner || 0,
              total: userMeal?.total || 0,
              date: date,
              messId: userMeal?.messId,
              monthId: month?._id,
              addBy: month?.manager,
            });

            // test push notification
            const pushTitle = `মিল যোগ করা হয়েছে`;
            const body = `মোট মিল: ${meal?.total}টি , তারিখ: ${moment(
              meal?.date
            ).format('DD/MM/YY')}`;
            const member = await User.findById(userId).select('FCMToken');
            if (member && member?.FCMToken) {
              const FCMToken = member?.FCMToken;
              await pushNotification(pushTitle, body, FCMToken);
            }
          }
        } else {
        }
      });

      // auto meal update
      const autoMealUpdate = await AutoMealUpdate.findOne({
        $and: [{ messId: mess?._id }, { monthId: month?._id }],
      });
      if (autoMealUpdate) {
        const autoMealUpdateObject = {
          breakfast: true,
          lunch: false,
          dinner: false,
          tomorrow: false,
          date: moment().format(),
        };

        const upDoc = await AutoMealUpdate.findByIdAndUpdate(
          autoMealUpdate?._id,
          autoMealUpdateObject,
          {
            new: true,
            runValidators: true,
          }
        );

        console.log('auto meal update cron');
      }
    }
  });
};

module.exports.pushNotificationMarketers = async (params) => {
  // all mess
  const allMess = await Mess.find().select('allMember');

  // forEach work

  allMess.forEach(async (mess) => {
    // find active month
    const month = await Month.findOne({
      $and: [{ messId: mess?._id }, { active: true }],
    });

    if (month) {
      // all Member meals add in next day
      let date;
      if (params == 'আগামীকাল') {
        date = moment().add(1, 'days');
      } else {
        date = moment().format();
      }

      const isMonthDate = moment(month.date).isSame(date, 'month');
      // find oldMeals
      if (isMonthDate) {
        // users Meals
        const tomorrowMarketers = await Marketer.find({
          $and: [
            { messId: mess?._id },
            { monthId: month?._id },
            {
              date: {
                $gte: moment(date).startOf('day'),
                $lte: moment(date).endOf('day'),
              },
            },
          ],
        });
        if (tomorrowMarketers) {
          // send push notification for marketers
          tomorrowMarketers.map(async (marketersId) => {
            const marker = await User.findById(marketersId).select('FCMToken');

            if (marker?.FCMToken) {
              const pushBody = `আপনার ${params} বাজার।`;
              const pushTitle = `${
                marker.name
              } ${params} আপনার বাজার তারিখ: ${moment(date).format(
                'DD/MM/YYYY'
              )}`;

              await pushNotification(pushTitle, pushBody, marker?.FCMToken);
            }
          });
        }
      }
    }
  });
};

module.exports.sendNotificationAllUser = async () => {
  const members = await User.find().select('FCMToken');
  const membersFCMTokens = [];
  members.forEach((member) => {
    if (member) {
      if (member.FCMToken) {
        membersFCMTokens.push(member.FCMToken);
      }
    }
  });
  // console.log(membersFCMTokens);
  // Push Notifications with Firebase

  const pushTitle = `Easy Mess অ্যাপ সম্পর্কে আপনার মতামত দিন।`;
  const pushBody = `"Easy Mess- মেস ম্যানেজার অ্যাপ" সম্পর্কে আপনার মূল্যবান মতামতটি Play Store এ রিভিউ দিয়ে জানিয়ে দিন। আপনার একটি মতামত আমাদেরকে নতুন নতুন ফিচার/ Update যুক্ত করতে উৎসাহিত করবে।`;

  // const result = await pushNotification(pushTitle, pushBody, FCMToken);
  // console.log(result);
  if (membersFCMTokens) {
    await pushNotificationMultiple(pushTitle, pushBody, membersFCMTokens);
  }
};
// await getUser();
// module.exports.updateMonthStatus = async () => {
//   await Month.updateMany({ active: false });
//   console.log('Your scheduled job at all month in unActive');
//   const today = moment().format('YYYY-MM-DD hh:mm:ss');
//   console.log(today);
// };
