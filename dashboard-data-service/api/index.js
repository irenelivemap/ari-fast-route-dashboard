const { sendIndex } = require("../lib/dashboard-data");

module.exports = function handler(req, res) {
  sendIndex(req, res);
};
