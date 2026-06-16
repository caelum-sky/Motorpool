// server/server.js
// BukSU Motorpool — Express API entry point.

require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");

// Initialize Firebase Admin before importing routes
require("./config/firebase");

const vehicleRoutes     = require("./routes/vehicles");
const inventoryRoutes   = require("./routes/inventory");
const tripRoutes        = require("./routes/tripTickets");
const maintenanceRoutes = require("./routes/maintenance");
const userRoutes        = require("./routes/users");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(morgan("dev"));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "BukSU Motorpool API" }));

app.use("/api/vehicles",    vehicleRoutes);
app.use("/api/inventory",   inventoryRoutes);
app.use("/api/trips",       tripRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/users",       userRoutes);

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚐  BukSU Motorpool API running on http://localhost:${PORT}`);
  console.log(`    Health check: http://localhost:${PORT}/api/health\n`);
});
