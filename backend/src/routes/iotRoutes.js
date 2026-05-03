const express = require('express');
const { reportIncident, getDevices } = require('../controllers/iotController');

const router = express.Router();

// Створення інциденту IoT-пристроєм (аутентифікація через X-Device-Api-Key)
router.post('/incidents', reportIncident);

// Список усіх пристроїв (публічний — фронт показує мапу/таблицю)
router.get('/devices', getDevices);

module.exports = router;