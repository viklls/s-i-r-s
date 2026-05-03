require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { IncidentStatus } = require('../src/constants/incidentStatus');

const prisma = new PrismaClient();

async function seed() {
  const [adminRole, userRole] = await Promise.all([
    prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } }),
    prisma.role.upsert({ where: { name: 'user' }, update: {}, create: { name: 'user' } })
  ]);

  await Promise.all([
    prisma.status.upsert({ where: { name: IncidentStatus.NEW }, update: {}, create: { name: IncidentStatus.NEW } }),
    prisma.status.upsert({ where: { name: IncidentStatus.IN_PROGRESS }, update: {}, create: { name: IncidentStatus.IN_PROGRESS } }),
    prisma.status.upsert({ where: { name: IncidentStatus.RESOLVED }, update: {}, create: { name: IncidentStatus.RESOLVED } })
  ]);

  const [low, medium, high] = await Promise.all([
    prisma.priority.upsert({ where: { name: 'Low' }, update: {}, create: { name: 'Low' } }),
    prisma.priority.upsert({ where: { name: 'Medium' }, update: {}, create: { name: 'Medium' } }),
    prisma.priority.upsert({ where: { name: 'High' }, update: {}, create: { name: 'High' } })
  ]);

  await Promise.all([
    prisma.category.upsert({ where: { name: 'Water Leak' }, update: {}, create: { name: 'Water Leak', priorityId: high.id } }),
    prisma.category.upsert({ where: { name: 'Power Outage' }, update: {}, create: { name: 'Power Outage', priorityId: high.id } }),
    prisma.category.upsert({ where: { name: 'Noise Complaint' }, update: {}, create: { name: 'Noise Complaint', priorityId: low.id } })
  ]);

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const userPassword = await bcrypt.hash('User123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@incident.local' },
    update: {},
    create: {
      email: 'admin@incident.local',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      roleId: adminRole.id
    }
  });

  await prisma.admin.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id }
  });

  await prisma.user.upsert({
    where: { email: 'user@incident.local' },
    update: {},
    create: {
      email: 'user@incident.local',
      passwordHash: userPassword,
      firstName: 'Default',
      lastName: 'User',
      roleId: userRole.id
    }
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });