const IncidentStatus = Object.freeze({
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved'
});

const STATUS_FLOW = [IncidentStatus.NEW, IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED];

module.exports = {
  IncidentStatus,
  STATUS_FLOW
};