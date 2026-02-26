const mongoose = require("mongoose");

function notFound(req, res) {
  return res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: error.message });
  }

  const statusCode = Number(error.statusCode || 500);
  return res.status(statusCode).json({
    message: error.message || "Internal server error"
  });
}

module.exports = { notFound, errorHandler };
