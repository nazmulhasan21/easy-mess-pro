
const moment = require('moment');
const Meal = require('../models/mealModel');



const Mess = require("../models/messModel");
const Month = require("../models/monthModel");
const User = require('../models/userModel');
const { pushNotification } = require('../utils/push-notification');

// update meal
module.exports.updateMeal = async () => {
    // all mess
    const allMess = await Mess.find({ _id: '63e771ae4bd932ba3cd793b7' }).select(
      'allMember'
    );

    // forEach work

    allMess.forEach(async (mess) => {
      // find active month
      const month = await Month.findOne({
        $and: [{ messId: mess._id }, { active: true }],
      });
      if (month) {
        const members = mess.allMember;
        // all Member meals add in next day
        members.map(async (userId) => {
          const date = moment().add(1, 'days');
          const isMonthDate = moment(month.date).isSame(date, 'month');
          // find oldMeals
          if (isMonthDate) {
            const oldMeals = await Meal.findOne({
              $and: [
                { userId: userId },
                { monthId: month._id },
                {
                  date: {
                    $gte: moment(date).startOf('day'),
                    $lte: moment(date).endOf('day'),
                  },
                },
              ],
            });

            // if no add next day meal
            if (oldMeals) {
              console.log({ oldMeals });
            } else {
              // users Meals
              const userMeals = await Meal.find({
                $and: [{ userId: userId }, { monthId: month._id }],
              });
              const lastDayMeal = userMeals[userMeals.length - 1];
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
              if (member && member.FCMToken) {
                const FCMToken = member.FCMToken;
                await pushNotification(pushTitle, body, FCMToken);
              }
            }
          } else {
            console.log({ isMonthDate });
          }
        });
      }
    });

    //   const users = await User.find().select('FCMToken');

    // Push Notifications with Firebase

    // users.forEach(async (user) => {
    //   const pushBody = ` ${user.name} আপনাকে Easy Mess App এর পক্ষথেকে Valentines Day 2023 এর শুভেচ্ছা জানাই। ভালো বাসা ছড়িয়ে পরুক সবখানে।`;
    //   const pushTitle = `Happy Valentines Day 2023`;

    //   if (user.FCMToken) {
    //     const send = await pushNotification(pushTitle, pushBody, user.FCMToken);
    //     console.log(send);
    //   }
    // });
  };




 

