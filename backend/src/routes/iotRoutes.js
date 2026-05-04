const express = require('express');
const { reportIncident, getDevices } = require('../controllers/iotController');

const router = express.Router();

router.post('/incidents', reportIncident);

router.get('/devices', getDevices);

module.exports = router;