const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({
  path: './config.env',
});

process.env.PUPPETEER_SKIP_DOWNLOAD;

// process.on('uncaughtException', (err) => {
//   console.log('UNCAUGHT EXCEPTION!!! shutting down...');
//   console.log(err.name, err.message);
//   process.exit(1);
// });

const app = require('./app');
// const app = require('express');
const database = 'mongodb://0.0.0.0:27017/easy-mess';

// -> Connect the database

mongoose
  .connect(
    //  database,
    process.env.DB_URL,

    {
      // useNewUrlParser: true,
      // useCreateIndex: true,
      // useFindAndModify: false,
    }
  )
  .then((con) => {
    console.log('DB connection Successfully!');
  });

// -> Start the server

app.listen(process.env.PORT || 8000, () => {
  console.log(`Application is running on port ${process.env.PORT || 8000}  `);
});
