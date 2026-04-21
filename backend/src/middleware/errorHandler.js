const { AppError } = require('../utils/errors');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`
    }
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const response = {
    error: {
      message: statusCode === 500 ? 'Internal server error' : error.message
    }
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    response.error.debug = error.message;
  }

  console.error(error);
  return res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
