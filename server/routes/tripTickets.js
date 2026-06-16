// server/routes/tripTickets.js
// Digital trip ticket request, approval, and completion workflow.

const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { verifyToken, requireRole } = require("../middleware/auth");
const { FieldValue } = require("firebase-admin/firestore");

const COLLECTION = "trip_tickets";
const VEHICLES   = "vehicles";

// ── GET /api/trips ── list tickets (filtered by role automatically)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { status, vehicleId, driverId } = req.query;
    let query = db.collection(COLLECTION).orderBy("createdAt", "desc").limit(100);

    // Drivers see only their assigned trips
    if (req.user.role === "driver") {
      query = db.collection(COLLECTION)
        .where("driverId", "==", req.user.uid)
        .orderBy("createdAt", "desc");
    }
    // Staff see only their own requests
    else if (req.user.role === "staff") {
      query = db.collection(COLLECTION)
        .where("requestorId", "==", req.user.uid)
        .orderBy("createdAt", "desc");
    }
    // Admin / motorpool can filter by anything
    else {
      if (status)    query = db.collection(COLLECTION).where("status", "==", status).orderBy("createdAt", "desc");
      if (vehicleId) query = db.collection(COLLECTION).where("vehicleId", "==", vehicleId).orderBy("createdAt", "desc");
      if (driverId)  query = db.collection(COLLECTION).where("driverId", "==", driverId).orderBy("createdAt", "desc");
    }

    const snapshot = await query.get();
    res.json(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/trips/:id ── single ticket
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Trip ticket not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trips ── submit a trip request (any authenticated user)
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      destination, purpose, dateTravel, timeDepart, timeReturn,
      passengers, vehiclePreference, remarks,
    } = req.body;

    if (!destination || !purpose || !dateTravel) {
      return res.status(400).json({ error: "destination, purpose, and dateTravel are required" });
    }

    const data = {
      requestorId:        req.user.uid,
      requestorName:      req.user.name || req.user.email,
      requestorDept:      req.user.officeDepartment || "",
      destination,
      purpose,
      dateTravel,
      timeDepart:         timeDepart || "",
      timeReturn:         timeReturn || "",
      passengers:         passengers || [],       // array of { name, designation }
      vehiclePreference:  vehiclePreference || null,
      vehicleId:          null,                  // assigned by motorpool
      driverId:           null,                  // assigned by motorpool
      driverName:         null,
      startKM:            null,
      endKM:              null,
      fuelConsumed:       null,
      remarks:            remarks || "",
      status:             "pending",             // pending | approved | ongoing | completed | rejected
      approvedBy:         null,
      approvedAt:         null,
      completedAt:        null,
      createdAt:          FieldValue.serverTimestamp(),
      updatedAt:          FieldValue.serverTimestamp(),
    };

    const ref = await db.collection(COLLECTION).add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/trips/:id/approve ── approve & assign vehicle/driver (admin, motorpool)
router.patch("/:id/approve", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const { vehicleId, driverId, driverName } = req.body;
    if (!vehicleId || !driverId) {
      return res.status(400).json({ error: "vehicleId and driverId are required for approval" });
    }

    // Mark vehicle as dispatched
    await db.collection(VEHICLES).doc(vehicleId).update({
      conditionStatus: "dispatched",
      updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection(COLLECTION).doc(req.params.id).update({
      vehicleId,
      driverId,
      driverName:  driverName || "",
      status:      "approved",
      approvedBy:  req.user.uid,
      approvedAt:  FieldValue.serverTimestamp(),
      updatedAt:   FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/trips/:id/complete ── complete trip with odometer readings (driver, motorpool, admin)
router.patch("/:id/complete", verifyToken, requireRole("admin", "motorpool", "driver"), async (req, res) => {
  try {
    const { startKM, endKM } = req.body;
    if (startKM === undefined || endKM === undefined) {
      return res.status(400).json({ error: "startKM and endKM are required" });
    }

    const start = Number(startKM);
    const end   = Number(endKM);
    if (end < start) return res.status(400).json({ error: "endKM must be >= startKM" });

    // Fetch ticket to get vehicleId
    const ticketDoc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!ticketDoc.exists) return res.status(404).json({ error: "Trip ticket not found" });

    const { vehicleId } = ticketDoc.data();

    // Update vehicle odometer and status back to available
    if (vehicleId) {
      await db.collection(VEHICLES).doc(vehicleId).update({
        currentOdometer: end,
        conditionStatus: "available",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await db.collection(COLLECTION).doc(req.params.id).update({
      startKM:      start,
      endKM:        end,
      fuelConsumed: end - start,
      status:       "completed",
      completedAt:  FieldValue.serverTimestamp(),
      updatedAt:    FieldValue.serverTimestamp(),
    });

    res.json({ success: true, distanceTraveled: end - start });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/trips/:id/reject ── reject request (admin, motorpool)
router.patch("/:id/reject", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const { reason } = req.body;
    await db.collection(COLLECTION).doc(req.params.id).update({
      status:     "rejected",
      remarks:    reason || "",
      updatedAt:  FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
