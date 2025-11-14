// middleware/asyncHandler.js

// Recibe un controlador async y captura cualquier error
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
