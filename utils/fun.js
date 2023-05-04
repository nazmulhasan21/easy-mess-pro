const moment = require('moment');
const _ = require('lodash');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');

const User = require('../models/userModel');
const UserMonthData = require('../models/userMonthDataModel');
const MonthMemberData = require('../models/monthMemberDataModel');
const Meal = require('../models/mealModel');

const Cost = require('../models/costModel');
const Month = require('../models/monthModel');
const OtpCode = require('../models/otpCodeModel');
const { sendEmail } = require('./sendEmail');
const createPDF = require('./createPDF');
const Mess = require('../models/messModel');

/**
 *
 * @param {object} user req user object
 * @param {object} mess user mess object
 * @param {string} monthName month title
 * @param {Date} data month date
 */

// create month and other data
module.exports.createMonth = async (user, mess, monthName, date) => {
  try {
    // find old same month
    const oldMonth = await Month.find({
      $and: [
        { messId: mess._id },
        {
          date: {
            $gte: moment(date).startOf('month'),
            $lte: moment(date).endOf('month'),
          },
        },
      ],
    });
    // set new monthTitle
    let newMonthTitle;
    if (oldMonth.length > 0) {
      newMonthTitle = monthName + '(' + (oldMonth.length + 1) + ')';
    } else {
      newMonthTitle = monthName;
    }
    //  1. create  your active month

    const month = await Month.create({
      messId: mess._id,
      monthTitle: newMonthTitle,
      date,
      manager: user._id,
    });

    // 2. add monthId in mess
    mess.month.push(month);

    // 3. create user Month data
    mess.allMember.forEach(async (user) => {
      await this.createUserMonthData(user, month, mess._id);
    });

    await month.save();
    await mess.save();
    return month;
  } catch (error) {
    return error;
  }
};

/**
 *
 * @param {User} user mess member user
 * @param {object} month active month object
 * @param {Mess._id} messId user mess Id
 */

module.exports.createUserMonthData = async (user, month, messId) => {
  try {
    // const user = await User.findById(user.d);
    const userMonthData = new UserMonthData({
      userId: user._id,
      monthId: month._id,
      messId,
      rollNo: user.rollNo || 1,
    });
    await userMonthData.save();

    user.months.push(month);
    user.messId = messId;
    await user.save();
  } catch (error) {
    return error;
  }
};

/**
 *
 * @param {User._id} userId mess member user id
 * @param {object} month active month object
 */
module.exports.deleteUserMonthData = async (userId, month) => {
  try {
    await UserMonthData.findOneAndDelete({
      $and: [{ userId: userId }, { monthId: month._id }],
    });
    await MonthMemberData.deleteMany({
      $and: [{ userId: userId }, { monthId: month._id }],
    });
    await Meal.deleteMany({
      $and: [{ userId: userId }, { monthId: month._id }],
    });
    const user = await User.findOne({ _id: userId });
    user.months = [];
    user.role = 'border';
    user.messId = undefined;

    await user.save();
  } catch (error) {
    return error;
  }
};

/**
 * delete user mess
 * @param {Mess._id} messId user mess Id
 */
module.exports.deleteAll = async (messId) => {
  try {
    // 1. delete all meal in mess
    await Meal.deleteMany({ messId: messId });
    await Cost.deleteMany({ messId: messId });

    // 2. delete all month member data in mess
    await MonthMemberData.deleteMany({ messId: messId });

    // 6. delete all user months data
    await UserMonthData.deleteMany({ messId: messId });
    // 6.1 find user
    const users = await User.find({ messId: messId }).select('messId months');
    // 6.2 set user property months = [] and messId = undefined
    users.forEach(async (user) => {
      user.months = [];
      user.messId = undefined;
      // 6.3 save user
      await user.save();
    });
  } catch (error) {
    return error;
  }
};

/**
 *
 * @param {Month._id} monthId active month id
 * @param {Array} allMember all member array
 */
exports.deleteAllMonthData = async (monthId, allMember) => {
  try {
    // 1. delete this month cashes
    await MonthMemberData.deleteMany({ monthId: monthId });

    // 2. delete this month costs
    await Cost.deleteMany({ monthId: monthId });

    // 3. delete this month meals
    await Meal.deleteMany({ monthId: monthId });

    // 5. delete this month User month data
    await UserMonthData.deleteMany({ monthId: monthId });

    // 6. delete all user months in this month id
    allMember.forEach(async (userId) => {
      const user = await User.findById(userId).select('months');
      user.months.pull(monthId);
      await user.save();
    });
  } catch (error) {
    return error;
  }
};

// create otp code
/**
 *
 * @param {emailString} email is user email
 * @returns {object} otpCode object
 */

exports.createOtpCode = async (email) => {
  try {
    // find  this user before all otpCode and delete
    await OtpCode.deleteMany({ email });
    // generate verification code
    const code = Math.floor(1000 + Math.random() * 9000);
    const expiredAt = new Date().getTime() + 30 * 60 * 1000;

    // save this code in database
    const otpCode = await OtpCode.create({
      email: email,
      code: code,
      expiredAt: expiredAt,
    });
    return otpCode;
  } catch (error) {
    return error;
  }
};

// not work
exports.checkOtpCode = async (email, htmlTemplates) => {
  try {
    const otpCode = await OtpCode.findOne({ email, code });
    if (!otpCode) {
      return next(new AppError(401, 'code', `code is wrong`));
    }

    // expired time
    const expired = otpCode?.expiredAt - new Date().getTime();
    if (expired < 0) {
      await OtpCode.findByIdAndDelete(otpCode._id);
      const otpCode = await createOtpCode(newEmail);
      const to = [{ newEmail, name: user.name }];
      const subject = 'Email verification';
      const html = htmlTemplates;
      const params = {
        userName: user.name,
        code: otpCode.code,
      };
      // send email
      sendEmail(to, subject, html, params);
      return next(
        new AppError(401),
        'code',
        'Code is expired. please check email sending new code'
      );
    }
  } catch (error) {
    return error;
  }
};

/**
 *
 * @param {object} to email object
 * @param {string} subject  subject
 * @param {string} templateName email template Name
 * @returns
 */
exports.sendVerificationCode = async (to, subj, templateName) => {
  try {
    const otpCode = await this.createOtpCode(to.email);
    const receiver = [to];
    const subject = subj;
    const filePath = path.join(
      process.cwd(),
      'emailTemplates',
      `${templateName}.html`
    );

    // get the html
    const html = fs.readFileSync(filePath).toString();

    const params = {
      userName: to?.name,
      code: otpCode.code,
      subject: subj,
    };
    // send email
    const sent = await sendEmail(receiver, subject, html, params);
    return sent;
  } catch (error) {
    return error;
  }
};

exports.getMessMemberFCMTokens = async (messId) => {
  const members = await User.find({ messId }).select('FCMToken');
  const membersFCMTokens = [];
  members.forEach((member) => {
    if (member) {
      if (member.FCMToken) {
        membersFCMTokens.push(member.FCMToken);
      }
    }
  });
  return membersFCMTokens;
};
// get mess manager and sub manager
exports.getMessManagerSubFCMTokens = async (messId) => {
  const managerSub = await User.find({
    $and: [
      { messId: messId },
      { $or: [{ role: 'manager' }, { role: 'subManager' }] },
    ],
  }).select('FCMToken');
  const membersFCMTokens = [];
  managerSub.forEach((managerSub) => {
    if (managerSub) {
      if (managerSub.FCMToken) {
        membersFCMTokens.push(managerSub.FCMToken);
      }
    }
  });
  return membersFCMTokens;
};

// get pdf
/**
 *
 * @param {ObjectId} monthId
 * @returns
 */
exports.getMonthPdf = async (month, next) => {
  try {
    const allUserMonthData = await UserMonthData.find({
      monthId: month._id,
    })
      .populate('userId', 'name avatar')
      .sort({ rollNo: 1 });
    // get every user data
    const memberData = async (userId) => {
      const memberItem = await MonthMemberData.find({
        $and: [{ monthId: month._id }, { userId: userId }],
      }).select('userId name type amount date');

      const item = memberItem.map((item) => {
        return {
          type: item.type,
          amount: item.amount,
          date: item.date,
        };
      });

      const getDataTypeItem = (type) => {
        return _.filter(item, ['type', `${type}`]);
      };

      const itemSum = (type) => {
        return _.sumBy(type, 'amount');
      };

      const cash = getDataTypeItem('cash');
      const rice = getDataTypeItem('rice');
      const extraRice = getDataTypeItem('extraRice');
      const guestMeal = getDataTypeItem('guestMeal');

      const cashTotal = itemSum(cash);
      const riceTotal = itemSum(rice);
      const extraRiceTotal = itemSum(extraRice);
      const guestMealTotal = itemSum(guestMeal);

      return (userData = {
        name: userId.name,
        avatar: userId.avatar,
        cash,
        rice,
        extraRice,
        guestMeal,
        cashTotal,
        riceTotal,
        extraRiceTotal,
        guestMealTotal,
      });
    };

    const monthMemberData = await Promise.all(
      allUserMonthData.map(async (item, index) => {
        return await memberData(item.userId);
      })
    );
    // end every user data

    // get all cost
    const costs = async () => {
      const data = await Cost.find({
        monthId: month._id,
      }).sort({ date: -1 });

      return data.map((item) => {
        return {
          type: item.type,
          title: item.title,
          amount: item.amount,
          date: item.date,
        };
      });
    };
    const allCost = await costs();

    const getCostTypeItem = (type) => {
      return _.filter(allCost, ['type', `${type}`]);
    };
    // cost type
    const bigCost = getCostTypeItem('bigCost');
    const smallCost = getCostTypeItem('smallCost');
    const otherCost = getCostTypeItem('otherCost');
    // sub

    const costSum = (type) => {
      return _.sumBy(type, 'amount');
    };

    // sub cost
    const bigCostSum = costSum(bigCost);
    const smallCostSum = costSum(smallCost);
    const otherCostSum = costSum(otherCost);

    // end all cost
    month.userMonthData = allUserMonthData;
    month.monthMemberData = monthMemberData;

    // month.meals = meals;
    month.costs = [
      { title: 'বড় বাজার খরচ', data: bigCost, total: bigCostSum },
      { title: 'অন্যান্য খরচ', data: otherCost, total: otherCostSum },
      { title: 'খুচরা খরচ', data: smallCost, total: smallCostSum },
    ];
    month.meals = [
      { title: 'মোট বড় বাজার', mark: ' ', amount: bigCostSum },
      { title: 'মোট খুচরা বাজার', mark: '+', amount: smallCostSum },
      { title: '', mark: '', amount: '_________' },
      {
        title: `মোট খরচ`,
        mark: '=',
        amount: bigCostSum + smallCostSum,
      },
      { title: 'মোট ফি: মিল', mark: '=', amount: month.totalFixedMeal },
      { title: '', mark: '', amount: '_________' },
      {
        title: ` মিল রেট   ( ${month.totalMealCost} / ${month.totalFixedMeal} )`,
        mark: '=',
        amount: month.mealRate,
      },
      {
        title: '',
        mark: '',
        amount: '',
      },
      {
        title: `ফি: মিলের খরচ   ( ${month.fixedMeal} * ${month.mealRate} )`,
        mark: '=',
        amount: (month.fixedMeal * month.mealRate).toFixed(2),
      },
      {
        title: '',
        mark: '',
        amount: '',
      },

      {
        title: '       অন্যান্য খরচের হিসাব',
      },
      {
        title: 'আপা ও অন্যান্য খরচ',
        mark: '=',
        amount: month.totalOtherCost,
      },
      {
        title: 'মোট বডার',
        mark: '=',
        amount: allUserMonthData.length,
      },
      { title: '', mark: '', amount: '_________' },
      {
        title: `বডার প্রতি খরচ ( ${month.totalOtherCost} / ${allUserMonthData.length} )`,
        mark: '=',
        amount: month.otherCostPerPerson,
      },
      {
        title: '      ফি: মিলের মোট খরচ',
        mark: '',
        amount: '',
      },

      {
        title: 'ফি: মিলের খরচ',
        mark: '=',
        amount: (month.fixedMeal * month.mealRate).toFixed(2),
      },
      {
        title: 'অন্যান্য খরচ',
        mark: '=',
        amount: month.otherCostPerPerson,
      },
      { title: '', mark: '', amount: '_________' },
      {
        title: 'একজন বডারের ফি: মিলের মোট খরচ',
        mark: '=',
        amount: Math.round(
          month.fixedMeal * month.mealRate + month.otherCostPerPerson
        ),
      },
    ];

    return month;
  } catch (error) {
    next(error);
  }
};

// test/////
const tt = async () => {
  try {
    const name = 'Md Nazmul hasan ';
    const randomNum = Math.floor(10 + Math.random() * 90).toString();

    const username = name.split(' ').join('');
    Md.Nazmulhasan;
    const Md = username.split('Md')[1];
    const md = username.split('md')[1];
    const Mst = username.split('Mst')[1];
    const mst = username.split('mst')[1];
    const dot = username.split('.')[1];
    let finalUserName = '';

    if (dot) {
      finalUserName = dot;
      finalUserName += randomNum;
    } else if (Md || md) {
      finalUserName = Md || md + randomNum;
      finalUserName += randomNum;
    } else if (Mst || mst) {
      finalUserName = Mst || mst + randomNum;
      finalUserName += randomNum;
    } else {
      finalUserName = username + randomNum;
      finalUserName += randomNum;
    }

    return finalUserName;
  } catch (error) {
    return error;
  }
};

/**
 *
 
 * @param {object} month active month object
 * @param {call back fun} next this is a call back fun
 * @returns
 */
exports.activeMonthAllData = async (month, next) => {
  try {
    const allUserMonthData = await UserMonthData.find({
      monthId: month._id,
    })
      .populate('userId', 'name avatar role')
      .sort({ rollNo: 1 });

    // month cost
    const costs = async () => {
      const data = await Cost.find({
        monthId: month._id,
      }).sort({ date: -1 });
      return data.map((item) => {
        return {
          _id: item._id,
          type: item.type,
          title: item.title,
          amount: item.amount,
          date: item.date,
        };
      });
    };
    const allCost = await costs();

    // data for cash rice others

    const getCostTypeItem = (type) => {
      return _.filter(allCost, ['type', `${type}`]);
    };
    // cost type
    const bigCost = getCostTypeItem('bigCost');
    const smallCost = getCostTypeItem('smallCost');
    const otherCost = getCostTypeItem('otherCost');
    // sub

    const costSum = (type) => {
      return _.sumBy(type, 'amount');
    };

    // sub cost
    const bigCostSum = costSum(bigCost);
    const smallCostSum = costSum(smallCost);
    const otherCostSum = costSum(otherCost);

    const memberData = async (type, userId) => {
      //
      const memberItem = await MonthMemberData.find({
        $and: [{ monthId: month._id }, { userId: userId }, { type: type }],
      })
        .select('monthId userId type amount date')
        .sort({ amount: -1 });

      return memberItem.map((item) => {
        return {
          _id: item._id,
          type: item.type,
          amount: item.amount,
          date: item.date,
        };
      });
    };

    const getItem = async (type) => {
      return await Promise.all(
        allUserMonthData.map(async (item, index) => {
          if (item.userId) {
            const data = await memberData(type, item.userId._id);

            const total = _.sumBy(data, 'amount');
            if (data.length > 0) {
              return {
                userId: item.userId._id,
                name: item.userId.name,
                avatar: item.userId.avatar,
                item: data,
                total,
              };
            }
          }
        })
      );
    };
    const cash = await getItem('cash');
    const rice = await getItem('rice');
    const extraRice = await getItem('extraRice');
    const guestMeal = await getItem('guestMeal');
    const extraCost = await getItem('extraCost');
    // sum

    const sum = (type) => {
      return _.sumBy(type, 'total');
    };
    const cashSum = sum(cash);
    const riceSum = sum(rice);
    const extraRiceSum = sum(extraRice);
    const guestMealSum = sum(guestMeal);
    const extraCostSum = sum(extraCost);

    // meals chart

    const mealData = async (userId) => {
      const memberMeal = await Meal.find({
        $and: [{ monthId: month._id }, { userId: userId }],
      })
        .populate('userId', '_id name avatar')
        .sort({});
      return memberMeal.map((meal) => {
        return {
          breakfast: meal.breakfast,
          lunch: meal.lunch,
          dinner: meal.dinner,
          total: meal.total,
          date: moment(meal.date).format('DD-MM-YY'),
        };
      });
    };
    month.meals = await Promise.all(
      allUserMonthData.map(async (item, index) => {
        if (item.userId) {
          const data = await mealData(item.userId._id);

          const total = _.sumBy(data, 'total');
          return {
            name: item.userId.name,
            avatar: item.userId.avatar,
            item: data,
            total,
          };
        }
      })
    );

    month.costs = [
      { title: 'বড় বাজার খরচ', data: bigCost, total: bigCostSum },
      { title: 'অন্যান্য খরচ', data: otherCost, total: otherCostSum },
      { title: 'খুচরা খরচ', data: smallCost, total: smallCostSum },
    ];
    month.monthMemberData = [
      { title: 'টাকা', data: cash, total: cashSum, type: 'cash' },
      { title: 'চাউল', data: rice, total: riceSum, type: 'rice' },
      {
        title: 'অতিরিক্ত চাউল',
        data: extraRice,
        total: extraRiceSum,
        type: 'extraRice',
      },
      {
        title: 'অতিথি মিল',
        data: guestMeal,
        total: guestMealSum,
        type: 'guestMeal',
      },
      // {
      //   title: 'বডারের অতিরিক্ত খরচ',
      //   data: extraCost,
      //   total: extraCostSum,
      //   type: 'extraCost',
      // },
    ];
    const userMonthData = allUserMonthData;
    month.userMonthData = userMonthData;

    return month;
  } catch (error) {
    next(error);
  }
};

exports.findBorderMissingRollNo = (allMember) => {
  // * get allMember rollNo
  var rollNos = [];
  for (let i = 0; i < allMember.length; i++) {
    rollNos.push(allMember[i].rollNo);
  }
  //2. find missing rollNo

  var missing = [];
  for (var i = 1; i <= Math.max(...rollNos) + 1; i++) {
    rollNos.indexOf(i) == -1 && missing.push(i);
  }
  // 3. return missing rollNo array []
  return missing;
};
//tt();

// date format in hbs template
hbs.registerHelper('dateFormat', function (date, options) {
  const formatToUse =
    (arguments[1] && arguments[1].hash && arguments[1].hash.format) ||
    'DD/MM/YYYY';
  return moment(date).format(formatToUse);
});
