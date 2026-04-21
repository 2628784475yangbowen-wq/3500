class AppError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function badRequest(message, details) {
  return new AppError(400, message, details);
}

function notFound(message = 'Resource not found') {
  return new AppError(404, message);
}

module.exports = {
  AppError,
  badRequest,
  notFound
};
