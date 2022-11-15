const UserMonthData = require('../models/userMonthDataModel');
const User = require('../models/userModel');
const {
  pushNotification,
  pushNotificationMultiple,
} = require('../utils/push-notification');

exports.sendNotification = async (messId, monthId, data, item) => {
  try {
    const memberData = await UserMonthData.find({})
      .select('FCMToken')
      .sort({ rollNo: 1 });

    const members = await Promise.all(
      memberData.map(async (item) => {
        const user = await User.findById(item.userId).select('name');
        if (user.FCMToken) {
          return user?.FCMToken;
        }
      })
    );
    console.log(members);
  } catch (error) {
    return error;
  }
};
