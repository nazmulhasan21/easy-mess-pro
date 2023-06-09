// Express automatically knows that this entire function is an  error handling middleware by specifying 4 parameters

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (err.errors) {
    let obj = {};
    const arrError = Array.isArray(err.errors);
    if (arrError) {
      err.statusCode = 422;
      err.errors.forEach((element) => {
        obj[element.param] = element.msg;
      });
    } else {
      // obj = err.errors;
      //  const errors = {};

      Object.keys(err.errors).forEach((key) => {
        obj[key] = err.errors[key].message;
      });
    }

    res.status(err.statusCode).json({
      status: err.status,
      error: obj,
      message: err.message,
      stack: err.stack,
    });
    return;
  }

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    // [err.path]: err.message,
    message: err.message,
    stack: err.stack,
  });
};
