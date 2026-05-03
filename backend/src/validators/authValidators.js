const { body } = require('express-validator');

const registerValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 6 }).withMessage('Password min length is 6'),
  body('first_name').isString().isLength({ min: 2 }).withMessage('first_name is required'),
  body('last_name').isString().isLength({ min: 2 }).withMessage('last_name is required')
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 6 }).withMessage('Password is required')
];

module.exports = { registerValidator, loginValidator };