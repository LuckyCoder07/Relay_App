require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const chatRoutes = require("./routes/chat");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "relay-backend" }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/chat", chatRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;

// Export the app for serverless use (Netlify functions)
module.exports = app;

// Only start the HTTP server when running locally / on a traditional server
if (process.env.NODE_ENV !== "production") {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB connected");
      app.listen(PORT, () => console.log(`Relay API running on http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
    });
} else {
  // In production (Netlify), still connect to Mongo but don't call listen()
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected (serverless)"))
    .catch((err) => console.error("MongoDB connection failed:", err.message));
}
