const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  let message = err.message || "Internal Server Error";
  if (message.includes("buffering timed out") || message.includes("buffering")) {
    message = "Service temporarily unavailable. Database connection issue. Please try again later.";
  }

  console.error(`Error (${statusCode}): ${message}`);

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
