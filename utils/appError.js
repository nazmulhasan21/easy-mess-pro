class AppError extends Error {
  constructor(statusCode, path, message, status) {
    super(message);
    this.statusCode = statusCode;
    this.status = status;
    this.message = message;
    this.path = path;
    if (path) {
      this[path] = message;
    }
  }
}

module.exports = AppError;
