const { validationResult } = require('express-validator');

/**
 * Middleware to check express-validator results.
 * Returns 400 with error messages if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array().map((e) => e.msg),
    });
  }
  next();
};

module.exports = validate;
