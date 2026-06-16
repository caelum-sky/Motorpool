// server/routes/maintenance.js
// Preventive maintenance scheduling and emergency Job Order Requests (JOR).

const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { verifyToken, requireRole } = require("../middleware/auth");
const { FieldValue } = require("firebase-admin/firestore");

const COLLECTION = "maintenance_logs";
const VEHICLES   = "vehicles";

// ── GET /api/maintenance ── list all logs (admin, motorpool, driver)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { vehicleId, type } = req.query;
    let query = db.collection(COLLECTION).orderBy("createdAt", "desc").limit(200);

    if (vehicleId) query = db.collection(COLLECTION).where("vehicleId", "==", vehicleId).orderBy("createdAt", "desc");
    if (type)      query = db.collection(COLLECTION).where("maintenanceType", "==", type).orderBy("createdAt", "desc");

    const snapshot = await query.get();
    res.json(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/maintenance/:id ── single log
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Maintenance log not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/maintenance ── create JOR (admin, motorpool)
router.post("/", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const {
      vehicleId, maintenanceType, jobDescription, datePerformed,
      technicianName, laborCost, partsUsed, nextServiceKM, status, remarks,
    } = req.body;

    if (!vehicleId || !jobDescription) {
      return res.status(400).json({ error: "vehicleId and jobDescription are required" });
    }

    // Compute total cost from partsUsed + laborCost
    const partsCost = (partsUsed || []).reduce((sum, p) => {
      return sum + (parseFloat(p.unitCost || 0) * Number(p.qtyUsed || 0));
    }, 0);

    const totalCost = partsCost + parseFloat(laborCost || 0);

    const data = {
      vehicleId,
      maintenanceType:  maintenanceType || "corrective",  // preventive | corrective | emergency
      jobDescription,
      datePerformed:    datePerformed || new Date().toISOString().split("T")[0],
      technicianName:   technicianName || "",
      laborCost:        parseFloat(laborCost) || 0,
      partsUsed:        partsUsed || [],   // [{ partId, itemName, qtyUsed, unitCost }]
      partsCost,
      totalCost,
      nextServiceKM:    nextServiceKM ? Number(nextServiceKM) : null,
      status:           status || "open",   // open | in_progress | completed
      remarks:          remarks || "",
      createdBy:        req.user.uid,
      createdAt:        FieldValue.serverTimestamp(),
      updatedAt:        FieldValue.serverTimestamp(),
    };

    // If type is corrective/emergency, mark vehicle under maintenance
    if (maintenanceType !== "preventive" && data.status !== "completed") {
      await db.collection(VEHICLES).doc(vehicleId).update({
        conditionStatus: "maintenance",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const ref = await db.collection(COLLECTION).add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/maintenance/:id ── update JOR (admin, motorpool)
router.put("/:id", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: FieldValue.serverTimestamp() };

    // Recompute total cost if parts changed
    if (updates.partsUsed || updates.laborCost !== undefined) {
      const doc = await db.collection(COLLECTION).doc(req.params.id).get();
      const existing = doc.data();
      const parts = updates.partsUsed || existing.partsUsed || [];
      const labor = parseFloat(updates.laborCost ?? existing.laborCost ?? 0);
      const partsCost = parts.reduce((s, p) => s + parseFloat(p.unitCost || 0) * Number(p.qtyUsed || 0), 0);
      updates.partsCost = partsCost;
      updates.totalCost = partsCost + labor;
    }

    // If marked completed, set vehicle back to available
    if (updates.status === "completed") {
      const doc = await db.collection(COLLECTION).doc(req.params.id).get();
      if (doc.exists && doc.data().vehicleId) {
        await db.collection(VEHICLES).doc(doc.data().vehicleId).update({
          conditionStatus: "available",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await db.collection(COLLECTION).doc(req.params.id).update(updates);
    res.json({ id: req.params.id, ...updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/maintenance/:id ── admin only
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
