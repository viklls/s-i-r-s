const prisma = require('../lib/prisma');
const { IncidentStatus } = require('../constants/incidentStatus');

const IOT_USER_EMAIL = 'iot-system@incident.local';

const SENSOR_CATEGORY_MAP = {
  water_leak:   'Water Leak',
  smoke:        'Fire Alarm Issue',
  power_grid:   'Power Outage',
  temperature:  'Heating / AC Issue',
  streetlight:  'Lighting',
  network:      'Internet / Network',
  noise:        'Noise Complaint',
  elevator:     'Elevator Malfunction'
};

const getDeviceByApiKey = async (apiKey) => {
  if (!apiKey) return null;
  return prisma.device.findUnique({ where: { apiKey } });
};

const getIotUser = async () => {
  return prisma.user.findUnique({ where: { email: IOT_USER_EMAIL } });
};

const createIotIncident = async ({ device, title, description, sensorReading }) => {
  const categoryName = SENSOR_CATEGORY_MAP[device.type];
  if (!categoryName) {
    throw new Error(`No category mapping for sensor type "${device.type}"`);
  }

  const category = await prisma.category.findUnique({ where: { name: categoryName } });
  if (!category) {
    throw new Error(`Category "${categoryName}" not found in DB. Run seed first.`);
  }

  const newStatus = await prisma.status.findUnique({ where: { name: IncidentStatus.NEW } });
  if (!newStatus) {
    throw new Error('Status "New" not found. Run seed first.');
  }

  const iotUser = await getIotUser();
  if (!iotUser) {
    throw new Error('IoT system user not found. Run seed-iot.js first.');
  }

  const fullDescription = sensorReading
    ? `${description}\n\n— Sensor reading: ${sensorReading}\n— Device: ${device.name} (${device.type})\n— Reported automatically by IoT.`
    : `${description}\n\n— Device: ${device.name} (${device.type})\n— Reported automatically by IoT.`;

  const incident = await prisma.incident.create({
    data: {
      title: title.trim(),
      description: fullDescription.trim(),
      location: device.location,
      categoryId: category.id,
      statusId: newStatus.id,
      authorId: iotUser.id,
      deviceId: device.id
    },
    include: {
      category: { select: { name: true } },
      status: { select: { name: true } },
      device: { select: { id: true, name: true, type: true } }
    }
  });

  await prisma.device.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() }
  });

  return incident;
};

const listDevices = async () => {
  return prisma.device.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      isActive: true,
      lastSeenAt: true,
      createdAt: true
    }
  });
};

module.exports = {
  getDeviceByApiKey,
  createIotIncident,
  listDevices,
  SENSOR_CATEGORY_MAP
};