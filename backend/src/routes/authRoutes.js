const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../validators/authValidators');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

router.post('/register', registerValidator, validateRequest, registerUser);
router.post('/login', loginValidator, validateRequest, loginUser);

module.exports = router;