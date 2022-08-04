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
const database = 'mongodb://localhost:27017/node-api-structure';

// -> Connect the database

mongoose
  .connect(
    database,
    // process.env.DB_URL,
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
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Application is running on port ${port} `);
});

// process.on('unhandledRejection', (err) => {
//   console.log('UNHANDLED REJECTION!!! shutting down .....');
//   console.log(err.name, err.message);
//   server.close(() => {
//     process.exit(1);
//   });
// });
