const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const cloudinary = require('cloudinary').v2;

//const PUPPETEER_SKIP_DOWNLOAD = 'true';

// Destructuring environment variables
const { CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;
// Configure cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});
// -> require Own

const api = require('./routes/routes');
const globalErrHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// fileUpload middleware
app.use(fileUpload({ useTempFiles: true }));

// -> Allow Cross-Origin requests
app.use(cors());

// -> Set security HTTP headers
app.use(helmet());

// -> Limit request form the same API
const limiter = rateLimit({
  max: 20,
  windowMs: 60 * 60 * 60 * 1000,
  message: 'Too Many Request from this IP, please try again in an hour',
});
app.use('/api/user-auth', limiter);

// -> Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '16kb',
  })
);

// -> Data sanitization against Nosql query injection
app.use(mongoSanitize());

// -> Data sanitization against XSS(clean user input from malicious HTML code)
app.use(xss());

// -> Prevent parameter pollution
app.use(hpp());

// Use Routes

app.use('/api/v1', api);

// handle undefined Routes
app.use('*', (req, res, next) => {
  const err = new AppError(404, 'fail', 'undefined route');
  next(err, req, res, next);
});

app.use(globalErrHandler);
module.exports = app;
