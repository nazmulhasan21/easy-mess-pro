const mongoose = require('mongoose');
const dotenv = require('dotenv');
const moment = require('moment');
dotenv.config({
  path: './config.env',
});

process.env.PUPPETEER_SKIP_DOWNLOAD;
// const schedule = require('node-schedule');
var cron = require('node-cron');
const { updateMeal, updateMonthStatus } = require('./cron');
// process.on('uncaughtException', (err) => {
//   console.log('UNCAUGHT EXCEPTION!!! shutting down...');
//   console.log(err.name, err.message);
//   process.exit(1);
// });

const app = require('./app');
// const app = require('express');

///job

const database = 'mongodb://0.0.0.0:27017/easy-mess';

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
    console.log('running a task  02:55');
    await updateMeal();
  },
  { scheduled: true, timezone: 'Asia/Dhaka' }
);

// const endOfMonth = moment().clone().endOf('month').format('DD');
// console.log(endOfMonth);
// //
// cron.schedule(
//   `59 23 ${endOfMonth} * *`,
//   async () => {
//     console.log('month status false done');
//     await updateMonthStatus();
//   },
//   { scheduled: true, timezone: 'Asia/Dhaka' }
// );
