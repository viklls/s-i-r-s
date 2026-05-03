const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const buildAuthResponse = (user) => {
  const role = user.admin || user.role.name === 'admin' ? 'admin' : 'user';
  const token = jwt.sign(
    { sub: user.id, role, email: user.email },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role
    }
  };
};

const register = async ({ email, password, firstName, lastName }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email is already registered');
  }

  const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
  if (!userRole) {
    throw new Error('Role "user" is not initialized. Run seed first.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      roleId: userRole.id
    },
    include: { role: true, admin: true }
  });

  return buildAuthResponse(user);
};

const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true, admin: true }
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new Error('Invalid email or password');
  }

  return buildAuthResponse(user);
};

module.exports = { register, login };