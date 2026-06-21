const serverless = require("serverless-http");
const app = require("./server"); // we'll need to export app from server.js

// Netlify functions run the express app
module.exports.handler = serverless(app);
