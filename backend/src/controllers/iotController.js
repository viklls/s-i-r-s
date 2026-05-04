const { getDeviceByApiKey, createIotIncident, listDevices } = require('../services/iotService');

const reportIncident = async (req, res) => {
  try {
    const apiKey = req.headers['x-device-api-key'];
    if (!apiKey) {
      return res.status(401).json({ message: 'Missing X-Device-Api-Key header' });
    }

    const device = await getDeviceByApiKey(apiKey);
    if (!device) {
      return res.status(401).json({ message: 'Invalid device API key' });
    }
    if (!device.isActive) {
      return res.status(403).json({ message: 'Device is disabled' });
    }

    const { title, description, sensorReading } = req.body;
    if (!title || title.length < 3) {
      return res.status(400).json({ message: 'title is required (min 3 chars)' });
    }
    if (!description || description.length < 5) {
      return res.status(400).json({ message: 'description is required (min 5 chars)' });
    }

    const incident = await createIotIncident({ device, title, description, sensorReading });
    return res.status(201).json({
      ok: true,
      incidentId: incident.id,
      device: incident.device,
      status: incident.status?.name,
      category: incident.category?.name,
      createdAt: incident.createdAt
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDevices = async (req, res) => {
  try {
    const devices = await listDevices();
    return res.json(devices);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { reportIncident, getDevices };