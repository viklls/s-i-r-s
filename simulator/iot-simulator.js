
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Кольори для консолі
const c = {
  reset:  '\x1b[0m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m'
};

// Шаблони подій для кожного типу датчика
const SCENARIOS = {
  water_leak: [
    { title: 'Water leak detected',          description: 'Moisture sensor crossed critical threshold.', readings: () => `moisture: ${85 + rand(0,14)}%` },
    { title: 'Possible pipe burst',          description: 'Sudden spike in water flow detected.',         readings: () => `flow: ${20 + rand(0,40)} L/min` }
  ],
  smoke: [
    { title: 'Smoke detected',               description: 'Smoke particles above safe level.',           readings: () => `density: ${rand(150,400)} ppm` },
    { title: 'Fire alarm triggered',         description: 'Both smoke and temperature sensors alerted.', readings: () => `temp: ${rand(55,85)}°C, smoke: HIGH` }
  ],
  power_grid: [
    { title: 'Power outage detected',        description: 'Substation reports loss of voltage.',         readings: () => `voltage: 0V (was 220V)` },
    { title: 'Voltage drop',                 description: 'Voltage below acceptable range.',             readings: () => `voltage: ${rand(140,180)}V` }
  ],
  temperature: [
    { title: 'Server room overheating',      description: 'Temperature exceeded safe operating range.',  readings: () => `temp: ${rand(33,42)}°C (limit: 28°C)` },
    { title: 'AC unit failure',              description: 'Temperature rising rapidly with no cooling.', readings: () => `temp: ${rand(30,38)}°C, rising +0.5°C/min` }
  ],
  streetlight: [
    { title: 'Streetlight not responding',   description: 'Lamp fails to turn on at scheduled time.',    readings: () => `last_response: ${rand(2,12)}h ago` },
    { title: 'Lamp burnt out',               description: 'Current draw dropped to zero.',                readings: () => `current: 0A (expected: ${rand(1,3)}A)` }
  ],
  network: [
    { title: 'Network connection unstable',  description: 'Packet loss exceeds acceptable level.',       readings: () => `loss: ${rand(15,80)}%, ping: ${rand(200,800)}ms` },
    { title: 'Internet down at location',    description: 'Connectivity lost to gateway.',               readings: () => `last_packet: ${rand(2,30)}min ago` }
  ],
  noise: [
    { title: 'Excessive noise detected',     description: 'Noise level above municipal limits.',          readings: () => `level: ${rand(85,110)} dB` },
    { title: 'Loud disturbance reported',    description: 'Continuous noise for over 5 minutes.',         readings: () => `peak: ${rand(95,120)} dB, duration: ${rand(5,15)}min` }
  ],
  elevator: [
    { title: 'Elevator stuck',               description: 'Elevator stopped between floors.',             readings: () => `floor: ${rand(2,9)}.${rand(1,9)}, motor: STOPPED` },
    { title: 'Elevator door fault',          description: 'Door fails to close after multiple attempts.', readings: () => `attempts: ${rand(5,15)}, sensor: BLOCKED` }
  ]
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickScenario(type) {
  const list = SCENARIOS[type] || [];
  return list[rand(0, list.length - 1)];
}

function colorForType(type) {
  const map = {
    water_leak:  c.cyan,
    smoke:       c.red,
    power_grid:  c.yellow,
    temperature: c.red,
    streetlight: c.yellow,
    network:     c.blue,
    noise:       c.yellow,
    elevator:    c.cyan
  };
  return map[type] || c.gray;
}

function ts() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

async function fireSensor(device) {
  const scenario = pickScenario(device.type);
  if (!scenario) {
    console.log(`${c.gray}[${ts()}] No scenario for type ${device.type}${c.reset}`);
    return;
  }

  const sensorReading = scenario.readings();
  const tag = colorForType(device.type) + `[${device.type.toUpperCase()}]` + c.reset;

  try {
    const res = await fetch(`${API_BASE}/iot/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Api-Key': device.apiKey
      },
      body: JSON.stringify({
        title: scenario.title,
        description: scenario.description,
        sensorReading
      })
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`${c.gray}[${ts()}]${c.reset} ${tag} ${c.green}✔${c.reset} ${c.bold}${scenario.title}${c.reset} → incident #${data.incidentId} (${sensorReading})`);
    } else {
      const err = await res.json().catch(() => ({}));
      console.log(`${c.gray}[${ts()}]${c.reset} ${tag} ${c.red}✘${c.reset} ${err.message || res.statusText}`);
    }
  } catch (err) {
    console.log(`${c.gray}[${ts()}]${c.reset} ${tag} ${c.red}✘ Network error:${c.reset} ${err.message}`);
  }
}

async function checkBackendAvailable() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log(c.bold + '\n╔══════════════════════════════════════════════════════════════╗' + c.reset);
  console.log(c.bold + '║        SmartCity IoT Sensor Network — Simulator           ║' + c.reset);
  console.log(c.bold + '╚══════════════════════════════════════════════════════════════╝' + c.reset);
  console.log(`API base: ${c.cyan}${API_BASE}${c.reset}\n`);

  const ok = await checkBackendAvailable();
  if (!ok) {
    console.log(`${c.red} Backend not reachable at ${API_BASE}${c.reset}`);
    console.log('   Start it first: cd backend && npm run start\n');
    process.exit(1);
  }

  const devices = await prisma.device.findMany({ where: { isActive: true } });
  if (!devices.length) {
    console.log(`${c.red} No active devices in DB.${c.reset}`);
    console.log('   Run first: node prisma/seed-iot.js\n');
    process.exit(1);
  }

  console.log(`${c.green} Backend online${c.reset}`);
  console.log(`${c.green} Loaded ${devices.length} active devices${c.reset}\n`);
  console.log(`${c.gray}Devices online:${c.reset}`);
  devices.forEach(d => {
    console.log(`  ${colorForType(d.type)}● ${d.type.padEnd(12)}${c.reset} ${d.name} ${c.gray}@ ${d.location}${c.reset}`);
  });
  console.log(`\n${c.gray}── Streaming events (Ctrl+C to stop) ──${c.reset}\n`);

  // Кожен датчик живе своїм циклом
  // інтервал між подіями — 15-45 секунд
  for (const device of devices) {
    const tick = async () => {
      // Випадково: чи створювати інцидент. ~30% шанс на тік
      if (Math.random() < 0.30) {
        await fireSensor(device);
      }
      const nextDelayMs = (15 + rand(0, 30)) * 1000; // 15-45 сек
      setTimeout(tick, nextDelayMs);
    };

    // Стартові затримки рознесені, щоб події не йшли пачкою
    const initialDelayMs = rand(2, 12) * 1000;
    setTimeout(tick, initialDelayMs);
  }
}

process.on('SIGINT', async () => {
  console.log(`\n${c.yellow}🛑 Shutting down simulator...${c.reset}`);
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(async (err) => {
  console.error('Fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});