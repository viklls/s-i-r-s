require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { IncidentStatus } = require('../src/constants/incidentStatus');

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding incidents...\n');

  // ===== Знайти існуючих користувачів =====
  const admin = await prisma.user.findUnique({ where: { email: 'admin@incident.local' } });
  const user = await prisma.user.findUnique({ where: { email: 'user@incident.local' } });

  if (!admin || !user) {
    console.error('Required users not found. Run the original seed first.');
    process.exit(1);
  }

  // ===== Знайти статуси =====
  const statusNew = await prisma.status.findUnique({ where: { name: IncidentStatus.NEW } });
  const statusInProgress = await prisma.status.findUnique({ where: { name: IncidentStatus.IN_PROGRESS } });
  const statusResolved = await prisma.status.findUnique({ where: { name: IncidentStatus.RESOLVED } });

  if (!statusNew || !statusInProgress || !statusResolved) {
    console.error('Statuses not found. Run the original seed first.');
    process.exit(1);
  }

  // ===== Додати недостаючі категорії =====
  // (зберігаю існуючі: Water Leak, Power Outage, Noise Complaint)
  // додаю нові, прив'язавши до існуючих пріоритетів
  const low = await prisma.priority.findUnique({ where: { name: 'Low' } });
  const medium = await prisma.priority.findUnique({ where: { name: 'Medium' } });
  const high = await prisma.priority.findUnique({ where: { name: 'High' } });

  if (!low || !medium || !high) {
    console.error('Priorities not found. Run the original seed first.');
    process.exit(1);
  }

  const newCategories = [
    { name: 'Broken Equipment', priorityId: medium.id },
    { name: 'Heating / AC Issue', priorityId: medium.id },
    { name: 'Internet / Network', priorityId: medium.id },
    { name: 'Lighting', priorityId: low.id },
    { name: 'Vandalism', priorityId: high.id },
    { name: 'Safety Hazard', priorityId: high.id },
    { name: 'Cleaning Required', priorityId: low.id },
    { name: 'Elevator Malfunction', priorityId: high.id }
  ];

  for (const cat of newCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
  }
  console.log(` ${newCategories.length} new categories added (existing ones kept)`);

  // ===== Зібрати всі категорії в map для зручності =====
  const allCategories = await prisma.category.findMany();
  const categories = {};
  for (const c of allCategories) {
    categories[c.name] = c;
  }

  // ===== Перевірка на дублі =====
  const existingIncidentsCount = await prisma.incident.count();
  if (existingIncidentsCount > 0) {
    console.log(`\n  ${existingIncidentsCount} incidents already exist in database.`);
    console.log('   Delete dev.db and re-run if you want a fresh dataset.\n');
    process.exit(0);
  }

  // ===== ІНЦИДЕНТИ =====
  const incidentsData = [
    {
      title: 'Water leak on the 3rd floor',
      description: 'There is a significant water leak coming from the ceiling near room 312. Water is dripping onto the floor and creating a slipping hazard.',
      location: 'Building A, 3rd floor, Room 312',
      category: 'Water Leak',
      status: statusInProgress.id,
      author: user,
      photos: ['https://images.unsplash.com/photo-1583795128727-6ec3642408f8?w=800'],
      comments: [
        { author: user, text: 'The leak has been getting worse over the past hour.' },
        { author: admin, text: 'Maintenance team has been dispatched.' }
      ]
    },
    {
      title: 'Power outage in the East Wing',
      description: 'The entire east wing has lost power. Workstations, lights, and air conditioning are all down. Approximately 40 employees affected.',
      location: 'Building B, East Wing',
      category: 'Power Outage',
      status: statusNew.id,
      author: user,
      photos: [],
      comments: []
    },
    {
      title: 'Loud construction noise outside lecture hall',
      description: 'Construction work near the main lecture hall is making it impossible to conduct classes. Noise has been ongoing since 8 AM.',
      location: 'Main Building, Lecture Hall 101',
      category: 'Noise Complaint',
      status: statusResolved.id,
      author: user,
      photos: [],
      comments: [
        { author: user, text: 'The noise level is well above acceptable limits.' }
      ]
    },
    {
      title: 'Projector in conference room not working',
      description: 'The main projector in conference room B-204 will not turn on. Tried different cables and laptops — no signal.',
      location: 'Building B, Conference Room 204',
      category: 'Broken Equipment',
      status: statusInProgress.id,
      author: user,
      photos: ['https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800'],
      comments: [
        { author: user, text: 'We have a presentation tomorrow morning, please prioritize.' }
      ]
    },
    {
      title: 'Air conditioning broken in server room',
      description: 'AC unit in server room SR-1 stopped working. Temperature is rising rapidly. Critical — servers may overheat.',
      location: 'Building A, Basement, Server Room SR-1',
      category: 'Heating / AC Issue',
      status: statusNew.id,
      author: user,
      photos: [],
      comments: [
        { author: user, text: 'Temperature is now at 32°C and rising.' }
      ]
    },
    {
      title: 'Wi-Fi extremely slow in library',
      description: 'Internet speeds in the library have been unusable for the past 3 days. Cannot load even basic web pages.',
      location: 'Main Library, Reading Hall',
      category: 'Internet / Network',
      status: statusResolved.id,
      author: user,
      photos: [],
      comments: [
        { author: user, text: 'Speed test shows 0.5 Mbps download.' },
        { author: admin, text: 'Issue resolved after router restart.' }
      ]
    },
    {
      title: 'Hallway lights flickering',
      description: 'Several fluorescent lights in the main hallway of building C have been flickering for over a week. Some have gone out completely.',
      location: 'Building C, Main Hallway, 2nd floor',
      category: 'Lighting',
      status: statusNew.id,
      author: user,
      photos: [],
      comments: []
    },
    {
      title: 'Graffiti on bathroom walls',
      description: 'Significant graffiti and damage found in the bathroom on the 2nd floor. Multiple stalls affected.',
      location: 'Building A, 2nd floor, Bathroom',
      category: 'Vandalism',
      status: statusInProgress.id,
      author: user,
      photos: ['https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=800'],
      comments: [
        { author: user, text: 'Looks like it happened over the weekend.' }
      ]
    },
    {
      title: 'Broken glass on staircase — danger!',
      description: 'A window has been broken on the staircase between floors 4 and 5. Glass shards on the steps. URGENT — someone may get injured.',
      location: 'Building B, Staircase between floors 4-5',
      category: 'Safety Hazard',
      status: statusResolved.id,
      author: user,
      photos: [],
      comments: [
        { author: user, text: 'I have placed a warning sign for now.' },
        { author: admin, text: 'Cleanup crew arrived, area is now safe.' }
      ]
    },
    {
      title: 'Cafeteria needs urgent cleaning',
      description: 'Spilled food and drinks have not been cleaned up since yesterday. Attracting insects.',
      location: 'Main Building, Cafeteria',
      category: 'Cleaning Required',
      status: statusResolved.id,
      author: user,
      photos: [],
      comments: []
    },
    {
      title: 'Elevator stuck between floors',
      description: 'Elevator #2 in building A has been stuck between the 4th and 5th floors. No one inside, but the elevator is non-functional.',
      location: 'Building A, Elevator #2',
      category: 'Elevator Malfunction',
      status: statusInProgress.id,
      author: user,
      photos: [],
      comments: [
        { author: user, text: 'I called the maintenance company directly.' }
      ]
    },
    {
      title: 'Window will not close in classroom',
      description: 'Window in classroom 215 is stuck open. With cold weather, it is freezing in the room.',
      location: 'Building A, Classroom 215',
      category: 'Broken Equipment',
      status: statusNew.id,
      author: user,
      photos: [],
      comments: []
    },
    {
      title: 'Parking lot lights not working at night',
      description: 'Half of the lights in the main parking lot have been out for a week. Safety concern for evening staff.',
      location: 'Main Parking Lot',
      category: 'Lighting',
      status: statusInProgress.id,
      author: user,
      photos: [],
      comments: [
        { author: user, text: 'It is very dark when leaving after 8 PM.' }
      ]
    },
    {
      title: 'Loud party music from neighbor unit',
      description: 'Music has been playing very loudly past 11 PM for three nights in a row.',
      location: 'Dormitory C, Room 408',
      category: 'Noise Complaint',
      status: statusResolved.id,
      author: user,
      photos: [],
      comments: []
    },
    {
      title: 'Printer jammed and not responding',
      description: 'Main office printer has a paper jam that cannot be cleared. Display shows error code E-52.',
      location: 'Building B, Main Office, 2nd floor',
      category: 'Broken Equipment',
      status: statusNew.id,
      author: user,
      photos: [],
      comments: [
        { author: user, text: 'Tried turning it off and on, no luck.' }
      ]
    }
  ];

  let createdCount = 0;
  for (const inc of incidentsData) {
    const incident = await prisma.incident.create({
      data: {
        title: inc.title,
        description: inc.description,
        location: inc.location,
        categoryId: categories[inc.category].id,
        statusId: inc.status,
        authorId: inc.author.id
      }
    });

    for (const url of inc.photos) {
      await prisma.incidentPhoto.create({
        data: { incidentId: incident.id, fileUrl: url }
      });
    }

    for (const c of inc.comments) {
      await prisma.incidentComment.create({
        data: {
          incidentId: incident.id,
          authorId: c.author.id,
          content: c.text
        }
      });
    }

    createdCount++;
  }

  console.log(` ${createdCount} incidents created with photos & comments`);
  console.log('\n Done!');
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