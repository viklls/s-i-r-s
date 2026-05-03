const {
  createIncident,
  listIncidents,
  getIncidentById,
  updateIncidentStatus,
  addIncidentComment,
  updateIncident,
  deleteIncident,
  listCategories
} = require('../services/incidentService');

const create = async (req, res) => {
  try {
    const { title, description, category, address, photo } = req.body;
    const incident = await createIncident({
      title,
      description,
      categoryName: category,
      address,
      photoUrl: photo,
      authorId: req.user.sub,
      authorRole: req.user.role
    });

    return res.status(201).json(incident);
  } catch (error) {
    const status = error.message.includes('not allowed') ? 403 : 400;
    return res.status(status).json({ message: error.message });
  }
};

const list = async (req, res) => {
  try {
    const { status, category } = req.query;
    const incidents = await listIncidents({ status, category });
    return res.json(incidents);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const incident = await getIncidentById(req.params.id);
    return res.json(incident);
  } catch (error) {
    return res.status(404).json({ message: error.message });
  }
};

const patchStatus = async (req, res) => {
  try {
    const incident = await updateIncidentStatus(req.params.id, req.body.status);
    return res.json(incident);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const patchComment = async (req, res) => {
  try {
    const incident = await addIncidentComment(req.params.id, req.user.sub, req.body.content);
    return res.json(incident);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { title, description, category, address } = req.body;
    const incident = await updateIncident(
      req.params.id,
      req.user.sub,
      req.user.role,
      { title, description, categoryName: category, address }
    );
    return res.json(incident);
  } catch (error) {
    const status = error.message.includes('not found') ? 404
                 : error.message.includes('Only') || error.message.includes('Cannot') ? 403
                 : 400;
    return res.status(status).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await deleteIncident(req.params.id);
    return res.json(result);
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await listCategories();
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  create,
  list,
  getById,
  patchStatus,
  patchComment,
  update,
  remove,
  getCategories
};