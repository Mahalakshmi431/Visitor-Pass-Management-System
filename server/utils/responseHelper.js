const sendSuccess = (res, { data, message, statusCode }) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  return res.status(statusCode || 200).json(response);
};

const sendError = (res, { message, statusCode, data }) => {
  const response = { success: false, message: message || "Internal Server Error" };
  if (data !== undefined) response.data = data;
  return res.status(statusCode || 500).json(response);
};

module.exports = { sendSuccess, sendError };
