/**
 * seed-iot.js
 *
 * Створює:
 *  1) Системного користувача "IoT System" — від його імені будуть створюватись інциденти від IoT
 *  2) 8 IoT-пристроїв (різних типів) з API-ключами
 *
 * Запуск:
 *   node prisma/seed-iot.js
 *
 * Безпечно перезапускати — використовує upsert.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const IOT_USER_EMAIL = 'iot-system@incident.local';

const DEVICES = [
  { name: 'Water Leak Detector — Khreshchatyk',  type: 'water_leak',   location: 'vul. Khreshchatyk, 22, basement' },
  { name: 'Smoke Detector — Building A F3',      type: 'smoke',        location: 'Building A, 3rd floor, corridor' },
  { name: 'Power Grid Monitor — Substation 14',  type: 'power_grid',   location: 'Substation #14, East district' },
  { name: 'Temperature Sensor — Server Room',    type: 'temperature',  location: 'Building A, basement, Server Room SR-1' },
  { name: 'Smart Streetlight — Park Shevchenka', type: 'streetlight',  location: 'Park Shevchenka, lamppost L-12' },
  { name: 'Network Quality — Library',           type: 'network',      location: 'Main Library, Reading Hall' },
  { name: 'Noise Sensor — Maydan',               type: 'noise',        location: 'Maydan Nezalezhnosti, central plaza' },
  { name: 'Elevator Monitor — Tower B',          type: 'elevator',     location: 'Residence Tower B, Elevator #2' }
];

async function seedIot() {
  console.log(' Seeding IoT system...\n');

  // 1. Системний юзер
  const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
  if (!userRole) {
    console.error(' Role "user" missing. Run main seed first.');
    process.exit(1);
  }

  const dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  const iotUser = await prisma.user.upsert({
    where: { email: IOT_USER_EMAIL },
    update: {},
    create: {
      email: IOT_USER_EMAIL,
      passwordHash: dummyPasswordHash,
      firstName: 'IoT',
      lastName: 'System',
      roleId: userRole.id
    }
  });
  console.log(` IoT system user: ${iotUser.email} (id=${iotUser.id})`);

  // 2. Девайси
  console.log('\n📡 Devices:');
  console.log('─'.repeat(80));

  const created = [];
  for (const d of DEVICES) {
    const apiKey = `iot_${crypto.randomBytes(16).toString('hex')}`;

    const device = await prisma.device.upsert({
      where: { name: d.name },
      update: {
        type: d.type,
        location: d.location,
        isActive: true
      },
      create: {
        name: d.name,
        type: d.type,
        location: d.location,
        apiKey,
        isActive: true
      }
    });
    created.push(device);
    console.log(`  • [${device.type.padEnd(12)}] ${device.name}`);
    console.log(`    apiKey: ${device.apiKey}`);
  }

  console.log('\n' + '─'.repeat(80));
  console.log(` ${created.length} devices ready.\n`);
  console.log(' Copy these API keys into iot-simulator.js (or use the auto-loader).\n');
}

seedIot()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });