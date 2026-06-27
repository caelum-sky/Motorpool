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

// origin: true reflects whatever origin the client sends, unblocking all
// origins including Capacitor's "https://localhost" on Android/iOS.
// Tighten this to an explicit allowlist before going to production.
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));

// Answer OPTIONS preflight before any auth middleware can reject it
app.options("*", cors());
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
app.listen(PORT, async () => {
  console.log(`\n🚐  BukSU Motorpool API running on http://localhost:${PORT}`);
  console.log(`    Health check: http://localhost:${PORT}/api/health\n`);

  // Warn early if this machine's clock is drifted — this can cause
  // "UNAUTHENTICATED" errors from Firebase token verification.
  try {
    const res = await fetch("https://www.google.com", { method: "HEAD" });
    const serverHeaderDate = new Date(res.headers.get("date"));
    const localDate = new Date();
    const driftMs = Math.abs(localDate - serverHeaderDate);

    if (driftMs > 60_000) {
      console.warn(
        `⚠️   SYSTEM CLOCK WARNING: your computer's clock differs from real time by ~${Math.round(driftMs / 1000)}s.\n` +
        `     Local time:  ${localDate.toISOString()}\n` +
        `     Real time:   ${serverHeaderDate.toISOString()}\n` +
        `     This WILL cause "Unauthorized" / "UNAUTHENTICATED" errors on every login and API call.\n` +
        `     Fix: Windows Settings → Time & Language → Date & Time → enable "Set time automatically" → click "Sync now".\n`
      );
    } else {
      console.log("✅  System clock is in sync with real time.");
    }
  } catch {
    // Network check failed — not critical, skip silently.
  }

  // Definitively test whether the service account key itself is still valid
  // by making a real authenticated Firestore call. This is the only way to
  // tell "credential is dead" apart from "clock is wrong" — both produce the
  // same 16 UNAUTHENTICATED error message, but only one is fixed by clock sync.
  try {
    const { db } = require("./config/firebase");
    await db.collection("_credential_check").limit(1).get();
    console.log("✅  Service account key is valid — Firestore Admin access confirmed.");
  } catch (credErr) {
    console.error(
      `\n❌  SERVICE ACCOUNT KEY TEST FAILED.\n` +
      `    This proves the problem is NOT the system clock — it's that\n` +
      `    server/config/serviceAccountKey.json is no longer accepted by Google.\n` +
      `    This happens when the key was deleted/rotated in Firebase Console\n` +
      `    after this file was downloaded, or the file is corrupted/truncated.\n\n` +
      `    Fix:\n` +
      `      1. Go to Firebase Console → Project Settings → Service Accounts\n` +
      `      2. Click "Generate new private key"\n` +
      `      3. Replace server/config/serviceAccountKey.json with the downloaded file\n` +
      `      4. Restart this server\n\n` +
      `    Raw error: ${credErr.message}\n`
    );
  }
});