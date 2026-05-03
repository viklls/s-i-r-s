const { body, query, param } = require('express-validator');
const { STATUS_FLOW } = require('../constants/incidentStatus');

const createIncidentValidator = [
  body('title').isString().isLength({ min: 3 }).withMessage('title is required'),
  body('description').isString().isLength({ min: 5 }).withMessage('description is required'),
  body('category').isString().notEmpty().withMessage('category is required'),
  body('address').isString().isLength({ min: 3 }).withMessage('address is required'),
  body('photo').optional().isURL().withMessage('photo must be valid URL')
];

const listIncidentsValidator = [
  query('status').optional().isString(),
  query('category').optional().isString()
];

const incidentIdValidator = [param('id').isInt({ min: 1 }).withMessage('id must be positive integer')];

const patchStatusValidator = [
  ...incidentIdValidator,
  body('status').isIn(STATUS_FLOW).withMessage(`status must be one of: ${STATUS_FLOW.join(', ')}`)
];

const patchCommentValidator = [
  ...incidentIdValidator,
  body('content').isString().isLength({ min: 2 }).withMessage('content is required')
];

// === НОВЕ ===
const updateIncidentValidator = [
  ...incidentIdValidator,
  body('title').optional().isString().isLength({ min: 3 }).withMessage('title min 3 chars'),
  body('description').optional().isString().isLength({ min: 5 }).withMessage('description min 5 chars'),
  body('category').optional().isString().notEmpty(),
  body('address').optional().isString().isLength({ min: 3 }).withMessage('address min 3 chars')
];

module.exports = {
  createIncidentValidator,
  listIncidentsValidator,
  incidentIdValidator,
  patchStatusValidator,
  patchCommentValidator,
  updateIncidentValidator
};