const mongoose = require('mongoose');
const dotenv = require('dotenv');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Dhaka');
dotenv.config({
  path: './config.env',
});

process.env.PUPPETEER_SKIP_DOWNLOAD;
// const schedule = require('node-schedule');
var cron = require('node-cron');
const {
  updateMeal,
  updateMonthStatus,
  pushNotificationMarketers,
  sendNotificationAllUser,
} = require('./cron');
// process.on('uncaughtException', (err) => {
//   console.log('UNCAUGHT EXCEPTION!!! shutting down...');
//   console.log(err.name, err.message);
//   process.exit(1);
// });

const app = require('./app');
// const app = require('express');

///job

const database = 'mongodb://0.0.0.0:27017/easy-mess';
//
// -> Connect the database

mongoose
  .connect(
    //  database,
    process.env.DB_URL

    // {
    //   useNewUrlParser: true,
    //   useCreateIndex: true,
    //   useFindAndModify: false,
    // }
  )
  .then((con) => {
    console.log('DB connection Successfully!');
  });

// -> Start the server

app.listen(process.env.PORT || 8000, () => {
  console.log(`Application is running on port ${process.env.PORT || 8000}  `);
});

cron.schedule(
  '45 08 * * *',
  async () => {
    console.log('running a task  08:45');
    await updateMeal();
  },
  { scheduled: true, timezone: 'Asia/Dhaka' }
);

cron.schedule(
  '00 19 * * *',
  async () => {
    await pushNotificationMarketers('আগামীকাল');
  },
  { scheduled: true, timezone: 'Asia/Dhaka' }
);

// const endOfMonth = moment().clone().endOf('month').format('DD');
// console.log(endOfMonth);
// //
// cron.schedule(
//   `00 22 01 * *`,
//   async () => {
//     await sendNotificationAllUser();
//     console.log('Send notification all user');
//   },
//   { scheduled: true, timezone: 'Asia/Dhaka' }
// );
