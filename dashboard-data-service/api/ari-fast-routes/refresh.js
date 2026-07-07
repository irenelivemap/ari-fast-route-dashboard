const { sendDashboardData } = require("../../lib/dashboard-data");

module.exports = function handler(req, res) {
  return sendDashboardData(req, res, "ari-fast-routes", { refresh: true });
};
