require('dotenv').config();
const app = require('./app');
const prisma = require('./lib/prisma');

const PORT = Number(process.env.PORT || 3000);

const start = async () => {
  try {
    await prisma.$connect();

    app.listen(PORT, () => {
      console.log(`Incident API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();