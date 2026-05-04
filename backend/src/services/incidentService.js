const prisma = require('../lib/prisma');
const { IncidentStatus, STATUS_FLOW } = require('../constants/incidentStatus');

const createIncident = async ({ title, description, categoryName, address, photoUrl, authorId, authorRole }) => {
  if (authorRole === 'admin') {
    throw new Error('Admins are not allowed to create incidents');
  }

  const category = await prisma.category.findUnique({ where: { name: categoryName } });
  if (!category) {
    throw new Error('Category not found');
  }

  const newStatus = await prisma.status.findUnique({ where: { name: IncidentStatus.NEW } });

  const incident = await prisma.incident.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      location: address.trim(),
      categoryId: category.id,
      statusId: newStatus.id,
      authorId
    }
  });

  return getIncidentById(incident.id);
};

const listIncidents = async ({ status, category }) => {
  const where = {};

  if (status) {
    const statusRow = await prisma.status.findUnique({ where: { name: status } });
    if (!statusRow) return [];
    where.statusId = statusRow.id;
  }

  if (category) {
    const categoryRow = await prisma.category.findUnique({ where: { name: category } });
    if (!categoryRow) return [];
    where.categoryId = categoryRow.id;
  }

  return prisma.incident.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true } },
      status: { select: { name: true } },
      author: { select: { id: true, firstName: true, lastName: true, email: true } },
      device: { select: { id: true, name: true, type: true } }
    }
  });
};

const getIncidentById = async (id) => {
  const incident = await prisma.incident.findUnique({
    where: { id: Number(id) },
    include: {
      category: { select: { name: true } },
      status: { select: { name: true } },
      device: { select: { id: true, name: true, type: true, location: true, lastSeenAt: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } }
            }
          }
        }
      },
      author: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  if (!incident) {
    throw new Error('Incident not found');
  }

  return incident;
};

const updateIncidentStatus = async (incidentId, newStatusName) => {
  const incident = await prisma.incident.findUnique({
    where: { id: Number(incidentId) },
    include: { status: true }
  });

  if (!incident) {
    throw new Error('Incident not found');
  }

  const newStatus = await prisma.status.findUnique({ where: { name: newStatusName } });
  if (!newStatus) {
    throw new Error('Invalid status');
  }

  if (incident.status.name === newStatus.name) {
    throw new Error('New status is the same as current');
  }

  await prisma.incident.update({
    where: { id: Number(incidentId) },
    data: { statusId: newStatus.id, lastUpdatedAt: new Date() }
  });

  return getIncidentById(incidentId);
};

const addIncidentComment = async (incidentId, authorId, content) => {
  const existingIncident = await prisma.incident.findUnique({ where: { id: Number(incidentId) } });
  if (!existingIncident) {
    throw new Error('Incident not found');
  }

  await prisma.incidentComment.create({
    data: {
      incidentId: Number(incidentId),
      authorId,
      content: content.trim()
    }
  });

  await prisma.incident.update({
    where: { id: Number(incidentId) },
    data: { lastUpdatedAt: new Date() }
  });

  return getIncidentById(incidentId);
};

const updateIncident = async (incidentId, userId, userRole, { title, description, categoryName, address }) => {
  const incident = await prisma.incident.findUnique({
    where: { id: Number(incidentId) },
    include: { status: true }
  });

  if (!incident) {
    throw new Error('Incident not found');
  }

  if (incident.authorId !== userId && userRole !== 'admin') {
    throw new Error('Only the author or an admin can edit this incident');
  }

  if (userRole !== 'admin' && incident.status.name !== IncidentStatus.NEW) {
    throw new Error('Cannot edit incident after work has started');
  }

  const data = { lastUpdatedAt: new Date() };

  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description.trim();
  if (address !== undefined) data.location = address.trim();

  if (categoryName !== undefined) {
    const category = await prisma.category.findUnique({ where: { name: categoryName } });
    if (!category) throw new Error('Category not found');
    data.categoryId = category.id;
  }

  await prisma.incident.update({
    where: { id: Number(incidentId) },
    data
  });

  return getIncidentById(incidentId);
};

const deleteIncident = async (incidentId) => {
  const incident = await prisma.incident.findUnique({ where: { id: Number(incidentId) } });
  if (!incident) {
    throw new Error('Incident not found');
  }

  await prisma.incidentComment.deleteMany({ where: { incidentId: Number(incidentId) } });
  await prisma.incident.delete({ where: { id: Number(incidentId) } });

  return { id: Number(incidentId), deleted: true };
};

const listCategories = async () => {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { priority: { select: { name: true } } }
  });
};

module.exports = {
  STATUS_FLOW,
  createIncident,
  listIncidents,
  getIncidentById,
  updateIncidentStatus,
  addIncidentComment,
  updateIncident,
  deleteIncident,
  listCategories
};