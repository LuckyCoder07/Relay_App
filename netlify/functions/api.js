const serverless = require("serverless-http");
const app = require("../../backend/server");

// Netlify functions run the express app as a serverless handler
module.exports.handler = serverless(app);
