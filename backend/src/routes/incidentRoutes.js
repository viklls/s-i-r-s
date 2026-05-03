const express = require('express');
const {
  create,
  list,
  getById,
  patchStatus,
  patchComment,
  update,
  remove,
  getCategories
} = require('../controllers/incidentsController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const {
  createIncidentValidator,
  listIncidentsValidator,
  incidentIdValidator,
  patchStatusValidator,
  patchCommentValidator,
  updateIncidentValidator
} = require('../validators/incidentValidators');

const router = express.Router();

// Categories list (public)
router.get('/categories', getCategories);

router.get('/', listIncidentsValidator, validateRequest, list);
router.get('/:id', incidentIdValidator, validateRequest, getById);
router.post('/', authenticate, createIncidentValidator, validateRequest, create);
router.patch('/:id', authenticate, updateIncidentValidator, validateRequest, update);
router.patch('/:id/status', authenticate, requireAdmin, patchStatusValidator, validateRequest, patchStatus);
router.patch('/:id/comment', authenticate, patchCommentValidator, validateRequest, patchComment);
router.delete('/:id', authenticate, requireAdmin, incidentIdValidator, validateRequest, remove);

module.exports = router;