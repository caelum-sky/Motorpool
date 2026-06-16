// server/routes/vehicles.js
// CRUD for fleet vehicles + odometer update endpoint.

const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { verifyToken, requireRole } = require("../middleware/auth");
const { FieldValue } = require("firebase-admin/firestore");

const COLLECTION = "vehicles";

// ── GET /api/vehicles ── list all vehicles (any authenticated user)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = db.collection(COLLECTION);

    if (status) query = query.where("conditionStatus", "==", status);
    if (type)   query = query.where("type", "==", type);

    const snapshot = await query.orderBy("plateNumber").get();
    const vehicles = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/vehicles/:id ── single vehicle
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Vehicle not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/vehicles ── create vehicle (admin, motorpool)
router.post("/", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const {
      plateNumber, brand, model, type, engineDisplacement,
      currentOdometer, conditionStatus, assignedDriverId, imageUrl, notes,
    } = req.body;

    if (!plateNumber || !model || !type) {
      return res.status(400).json({ error: "plateNumber, model, and type are required" });
    }

    const data = {
      plateNumber,
      brand:              brand || "",
      model,
      type,               // bus | van | utility | ambulance
      engineDisplacement: engineDisplacement || "",
      currentOdometer:    Number(currentOdometer) || 0,
      conditionStatus:    conditionStatus || "available", // available | dispatched | maintenance | unserviceable
      assignedDriverId:   assignedDriverId || null,
      imageUrl:           imageUrl || null,
      notes:              notes || "",
      createdAt:          FieldValue.serverTimestamp(),
      updatedAt:          FieldValue.serverTimestamp(),
    };

    const ref = await db.collection(COLLECTION).add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/vehicles/:id ── update vehicle (admin, motorpool)
router.put("/:id", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: FieldValue.serverTimestamp() };
    // Coerce numeric fields
    if (updates.currentOdometer !== undefined) updates.currentOdometer = Number(updates.currentOdometer);

    await db.collection(COLLECTION).doc(req.params.id).update(updates);
    res.json({ id: req.params.id, ...updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/vehicles/:id/odometer ── update odometer only (driver, motorpool, admin)
router.patch("/:id/odometer", verifyToken, requireRole("admin", "motorpool", "driver"), async (req, res) => {
  try {
    const { currentOdometer } = req.body;
    if (currentOdometer === undefined) return res.status(400).json({ error: "currentOdometer required" });

    await db.collection(COLLECTION).doc(req.params.id).update({
      currentOdometer: Number(currentOdometer),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ success: true, currentOdometer: Number(currentOdometer) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/vehicles/:id ── admin only
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
