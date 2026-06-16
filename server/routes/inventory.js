// server/routes/inventory.js
// Parts & lubricants inventory CRUD + "Issue Part" endpoint.

const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { verifyToken, requireRole } = require("../middleware/auth");
const { FieldValue } = require("firebase-admin/firestore");

const COLLECTION = "inventory";
const ISSUANCE_COLLECTION = "issuance_logs";

// ── GET /api/inventory ── list all parts (with optional low-stock filter)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { lowStock, category } = req.query;
    let snapshot;

    if (lowStock === "true") {
      // Firestore can't do cross-field comparisons natively — fetch all, filter in Node
      snapshot = await db.collection(COLLECTION).get();
      const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return res.json(all.filter((p) => p.stockQty <= p.reorderLevel));
    }

    let query = db.collection(COLLECTION);
    if (category) query = query.where("category", "==", category);
    snapshot = await query.orderBy("itemName").get();
    res.json(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/inventory/:id ── single part
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Part not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/inventory ── add new part (admin, motorpool)
router.post("/", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const {
      itemName, category, stockQty, reorderLevel,
      unitCost, shelfLocation, unit, supplier,
    } = req.body;

    if (!itemName || !category) {
      return res.status(400).json({ error: "itemName and category are required" });
    }

    const data = {
      itemName,
      category,          // spare_parts | lubricants | tires | batteries | filters | electrical | other
      stockQty:          Number(stockQty) || 0,
      reorderLevel:      Number(reorderLevel) || 5,
      unitCost:          parseFloat(unitCost) || 0,
      unit:              unit || "piece",
      shelfLocation:     shelfLocation || "",
      supplier:          supplier || "",
      createdAt:         FieldValue.serverTimestamp(),
      updatedAt:         FieldValue.serverTimestamp(),
    };

    const ref = await db.collection(COLLECTION).add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/inventory/:id ── update part info (admin, motorpool)
router.put("/:id", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: FieldValue.serverTimestamp() };
    if (updates.stockQty !== undefined)    updates.stockQty    = Number(updates.stockQty);
    if (updates.reorderLevel !== undefined) updates.reorderLevel = Number(updates.reorderLevel);
    if (updates.unitCost !== undefined)    updates.unitCost    = parseFloat(updates.unitCost);

    await db.collection(COLLECTION).doc(req.params.id).update(updates);
    res.json({ id: req.params.id, ...updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/inventory/:id/issue ── issue a part to a vehicle (admin, motorpool)
// Decrements stock and writes to issuance_logs collection.
router.post("/:id/issue", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  const partRef  = db.collection(COLLECTION).doc(req.params.id);
  const logRef   = db.collection(ISSUANCE_COLLECTION).doc();

  try {
    const { vehicleId, qtyIssued, technicianName, remarks, maintenanceLogId } = req.body;

    if (!vehicleId || !qtyIssued) {
      return res.status(400).json({ error: "vehicleId and qtyIssued are required" });
    }

    await db.runTransaction(async (t) => {
      const partDoc = await t.get(partRef);
      if (!partDoc.exists) throw new Error("Part not found");

      const currentStock = partDoc.data().stockQty;
      const qty = Number(qtyIssued);

      if (currentStock < qty) {
        throw new Error(`Insufficient stock. Available: ${currentStock}`);
      }

      // Decrement stock
      t.update(partRef, {
        stockQty:  currentStock - qty,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Write issuance log
      t.set(logRef, {
        partId:           req.params.id,
        itemName:         partDoc.data().itemName,
        vehicleId,
        qtyIssued:        qty,
        unitCost:         partDoc.data().unitCost,
        totalCost:        partDoc.data().unitCost * qty,
        issuedBy:         req.user.uid,
        issuedByName:     req.user.name || req.user.email,
        technicianName:   technicianName || "",
        remarks:          remarks || "",
        maintenanceLogId: maintenanceLogId || null,
        issuedAt:         FieldValue.serverTimestamp(),
      });
    });

    res.json({ success: true, logId: logRef.id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/inventory/logs/all ── issuance history (admin, motorpool)
router.get("/logs/all", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const { vehicleId, partId } = req.query;
    let query = db.collection(ISSUANCE_COLLECTION).orderBy("issuedAt", "desc").limit(200);

    if (vehicleId) query = db.collection(ISSUANCE_COLLECTION).where("vehicleId", "==", vehicleId).orderBy("issuedAt", "desc");
    if (partId)    query = db.collection(ISSUANCE_COLLECTION).where("partId", "==", partId).orderBy("issuedAt", "desc");

    const snapshot = await query.get();
    res.json(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/inventory/:id ── admin only
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
