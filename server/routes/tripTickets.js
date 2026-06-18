// server/routes/tripTickets.js
// Digital trip ticket request, approval, and completion workflow.
// Supports MULTIPLE vehicle+driver assignments per ticket, with
// double-booking prevention (same plate or same driver, same date,
// overlapping time window) and email notifications at each stage.

const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { verifyToken, requireRole } = require("../middleware/auth");
const { FieldValue } = require("firebase-admin/firestore");
const { sendTripEmail } = require("../services/email");

const COLLECTION = "trip_tickets";
const VEHICLES   = "vehicles";
const USERS      = "users";

// ── Time helpers ────────────────────────────────────────────────────────────
// Trips without explicit times are treated as occupying the whole day,
// which is the safe default for conflict checking.
function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  // If either side is missing a time, assume the whole day (always overlaps on date match)
  if (aStart === null || bStart === null) return true;
  const aE = aEnd === null ? 24 * 60 : aEnd;
  const bE = bEnd === null ? 24 * 60 : bEnd;
  return aStart < bE && bStart < aE;
}

/**
 * findInternalConflicts — checks the assignments WITHIN a single submission
 * against each other. This catches things findConflicts() can never see,
 * since findConflicts only compares against OTHER tickets in the database —
 * it has no way to know that row 2 and row 3 of the SAME ticket assigned the
 * same driver to two different vehicles departing at the same time.
 */
function findInternalConflicts(assignments) {
  const conflicts = [];

  for (let i = 0; i < assignments.length; i++) {
    for (let j = i + 1; j < assignments.length; j++) {
      const a = assignments[i];
      const b = assignments[j];

      const sameDriver = a.driverId && b.driverId && a.driverId === b.driverId;
      const samePlate   = a.vehicleId && b.vehicleId && a.vehicleId === b.vehicleId;

      if (sameDriver || samePlate) {
        conflicts.push({
          ticketId: "this ticket",
          destination: null,
          timeDepart: null,
          timeReturn: null,
          plateNumber: a.plateNumber || b.plateNumber,
          driverName: a.driverName || b.driverName,
          reason: sameDriver && samePlate
            ? "The same vehicle and driver were assigned twice on this same ticket"
            : sameDriver
            ? "The same driver was assigned to two different vehicles on this same ticket — one person cannot drive two vehicles at once"
            : "The same vehicle was assigned twice on this same ticket",
        });
      }
    }
  }

  return conflicts;
}

/**
 * findConflicts — checks active (pending/approved/ongoing) tickets on the
 * same date for overlapping time windows that already use the same
 * vehicle plate or the same driver.
 *
 * @param {string} dateTravel
 * @param {string} timeDepart
 * @param {string} timeReturn
 * @param {Array<{vehicleId, driverId}>} candidateAssignments
 * @param {string} excludeTicketId - skip this ticket (used when editing)
 */
async function findConflicts(dateTravel, timeDepart, timeReturn, candidateAssignments, excludeTicketId = null) {
  // Check the submission against itself FIRST — no point querying the
  // database if the request is internally inconsistent on its own.
  const conflicts = findInternalConflicts(candidateAssignments);

  const snapshot = await db.collection(COLLECTION)
    .where("dateTravel", "==", dateTravel)
    .where("status", "in", ["pending", "approved", "ongoing"])
    .get();

  const newStart = toMinutes(timeDepart);
  const newEnd   = toMinutes(timeReturn);

  for (const doc of snapshot.docs) {
    if (doc.id === excludeTicketId) continue;
    const existing = doc.data();
    const exStart = toMinutes(existing.timeDepart);
    const exEnd   = toMinutes(existing.timeReturn);

    if (!rangesOverlap(newStart, newEnd, exStart, exEnd)) continue;

    for (const existingAssignment of existing.assignments || []) {
      for (const candidate of candidateAssignments) {
        const samePlate  = existingAssignment.vehicleId && candidate.vehicleId &&
                            existingAssignment.vehicleId === candidate.vehicleId;
        const sameDriver = existingAssignment.driverId && candidate.driverId &&
                            existingAssignment.driverId === candidate.driverId;

        if (samePlate || sameDriver) {
          conflicts.push({
            ticketId:     doc.id,
            destination:  existing.destination,
            timeDepart:   existing.timeDepart,
            timeReturn:   existing.timeReturn,
            plateNumber:  existingAssignment.plateNumber,
            driverName:   existingAssignment.driverName,
            reason: samePlate && sameDriver
              ? "Same vehicle and same driver already booked in this time window"
              : samePlate
              ? "Vehicle already booked in this time window"
              : "Driver already booked in this time window",
          });
        }
      }
    }
  }

  return conflicts;
}

// ── GET /api/trips ── list tickets (filtered by role automatically)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { status, vehicleId, driverId } = req.query;
    let query = db.collection(COLLECTION).orderBy("createdAt", "desc").limit(100);

    if (req.user.role === "driver") {
      query = db.collection(COLLECTION)
        .where("driverIds", "array-contains", req.user.uid)
        .orderBy("createdAt", "desc");
    } else if (req.user.role === "staff") {
      query = db.collection(COLLECTION)
        .where("requestorId", "==", req.user.uid)
        .orderBy("createdAt", "desc");
    } else {
      if (status)    query = db.collection(COLLECTION).where("status", "==", status).orderBy("createdAt", "desc");
      if (vehicleId) query = db.collection(COLLECTION).where("vehicleIds", "array-contains", vehicleId).orderBy("createdAt", "desc");
      if (driverId)  query = db.collection(COLLECTION).where("driverIds", "array-contains", driverId).orderBy("createdAt", "desc");
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

// ── POST /api/trips/check-conflicts ── pre-check before submitting/approving
router.post("/check-conflicts", verifyToken, async (req, res) => {
  try {
    const { dateTravel, timeDepart, timeReturn, assignments, excludeTicketId } = req.body;
    if (!dateTravel) return res.status(400).json({ error: "dateTravel is required" });

    const conflicts = await findConflicts(
      dateTravel, timeDepart, timeReturn, assignments || [], excludeTicketId
    );
    res.json({ hasConflicts: conflicts.length > 0, conflicts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trips ── submit a trip request (any authenticated user)
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      destination, purpose, dateTravel, timeDepart, timeReturn,
      passengers, numberOfVehicles, remarks, requestorEmail,
    } = req.body;

    if (!destination || !purpose || !dateTravel) {
      return res.status(400).json({ error: "destination, purpose, and dateTravel are required" });
    }
    if (!passengers || passengers.length === 0) {
      return res.status(400).json({ error: "At least one passenger must be specified" });
    }

    const data = {
      requestorId:       req.user.uid,
      requestorName:     req.user.name || req.user.email,
      requestorDept:     req.user.officeDepartment || "",
      requestorEmail:    requestorEmail || req.user.email || "",
      destination,
      purpose,
      dateTravel,
      timeDepart:        timeDepart || "",
      timeReturn:         timeReturn || "",
      passengers:        passengers || [],          // [{ name, designation }]
      numberOfVehicles:  Number(numberOfVehicles) || 1,
      assignments:       [],                        // [{ vehicleId, plateNumber, vehicleModel, driverId, driverName }]
      vehicleIds:        [],                         // flattened for querying
      driverIds:         [],                         // flattened for querying
      startKM:           null,
      endKM:             null,
      fuelConsumed:       null,
      remarks:            remarks || "",
      status:             "pending",
      approvedBy:          null,
      approvedAt:          null,
      completedAt:         null,
      emailLog:            [],
      createdAt:           FieldValue.serverTimestamp(),
      updatedAt:           FieldValue.serverTimestamp(),
    };

    const ref = await db.collection(COLLECTION).add(data);
    const created = { id: ref.id, ...data };

    // Fire-and-forget confirmation email
    sendTripEmail(created, "Submitted — Pending Approval", [created.requestorEmail])
      .then((r) => r.sent && db.collection(COLLECTION).doc(ref.id).update({
        emailLog: FieldValue.arrayUnion({ stage: "submitted", sentAt: new Date().toISOString() }),
      }))
      .catch(() => {});

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/trips/:id/approve ── approve & assign vehicle(s)/driver(s) (admin, motorpool)
router.patch("/:id/approve", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const { assignments } = req.body; // [{ vehicleId, driverId, driverName }]
    if (!assignments || assignments.length === 0) {
      return res.status(400).json({ error: "At least one vehicle+driver assignment is required" });
    }

    // Every assignment MUST have both a vehicle AND a driver — a trip can
    // never be approved/dispatched with an unassigned driver. This is what
    // the confirmation email displays as "Driver" further down, so this
    // guard is what prevents an "Unassigned" driver ever reaching that email.
    const incomplete = assignments.filter(a => !a.vehicleId || !a.driverId);
    if (incomplete.length > 0) {
      return res.status(400).json({
        error: `Cannot approve: ${incomplete.length} vehicle assignment(s) are missing a driver. Every vehicle must have a driver assigned before dispatch.`,
      });
    }

    const ticketDoc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!ticketDoc.exists) return res.status(404).json({ error: "Trip ticket not found" });
    const ticket = ticketDoc.data();

    // Resolve vehicle details + re-check conflicts server-side (defense in depth)
    const resolvedAssignments = [];
    for (const a of assignments) {
      const vDoc = await db.collection(VEHICLES).doc(a.vehicleId).get();
      if (!vDoc.exists) return res.status(400).json({ error: `Vehicle ${a.vehicleId} not found` });
      const v = vDoc.data();
      resolvedAssignments.push({
        vehicleId:    a.vehicleId,
        plateNumber:  v.plateNumber,
        vehicleModel: `${v.brand || ""} ${v.model}`.trim(),
        driverId:     a.driverId,
        driverName:   a.driverName || "",
      });
    }

    const conflicts = await findConflicts(
      ticket.dateTravel, ticket.timeDepart, ticket.timeReturn,
      resolvedAssignments, req.params.id
    );
    if (conflicts.length > 0) {
      return res.status(409).json({ error: "Scheduling conflict detected", conflicts });
    }

    // Mark each vehicle dispatched
    await Promise.all(
      resolvedAssignments.map((a) =>
        db.collection(VEHICLES).doc(a.vehicleId).update({
          conditionStatus: "dispatched",
          updatedAt: FieldValue.serverTimestamp(),
        })
      )
    );

    const updates = {
      assignments: resolvedAssignments,
      vehicleIds:  resolvedAssignments.map((a) => a.vehicleId),
      driverIds:   resolvedAssignments.map((a) => a.driverId).filter(Boolean),
      status:      "approved",
      approvedBy:  req.user.uid,
      approvedAt:  FieldValue.serverTimestamp(),
      updatedAt:   FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTION).doc(req.params.id).update(updates);
    const updatedTicket = { ...ticket, ...updates, id: req.params.id };

    // Email requestor + each assigned driver
    const driverEmails = [];
    for (const a of resolvedAssignments) {
      if (!a.driverId) continue;
      const uDoc = await db.collection(USERS).doc(a.driverId).get();
      if (uDoc.exists && uDoc.data().email) driverEmails.push(uDoc.data().email);
    }

    sendTripEmail(updatedTicket, "Approved & Dispatched", [ticket.requestorEmail, ...driverEmails]).catch(() => {});

    res.json({ success: true, assignments: resolvedAssignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/trips/:id/accept ── driver accepts their assigned trip
// Drivers cannot approve trips or assign vehicles to themselves — they can
// only acknowledge an assignment that motorpool/admin has already made.
router.patch("/:id/accept", verifyToken, requireRole("driver"), async (req, res) => {
  try {
    const ticketDoc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!ticketDoc.exists) return res.status(404).json({ error: "Trip ticket not found" });
    const ticket = ticketDoc.data();

    const isAssigned = (ticket.driverIds || []).includes(req.user.uid);
    if (!isAssigned) {
      return res.status(403).json({ error: "You are not assigned as a driver on this trip." });
    }
    if (ticket.status !== "approved") {
      return res.status(400).json({ error: `Cannot accept a trip with status "${ticket.status}".` });
    }

    await db.collection(COLLECTION).doc(req.params.id).update({
      driverAcceptances: FieldValue.arrayUnion({
        driverId: req.user.uid,
        driverName: req.user.name || req.user.email,
        acceptedAt: new Date().toISOString(),
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/trips/:id/decline ── driver declines their assigned trip
// Motorpool/admin must then reassign a different driver — declining does
// NOT cancel the whole trip, it just flags that this driver can't take it.
router.patch("/:id/decline", verifyToken, requireRole("driver"), async (req, res) => {
  try {
    const { reason } = req.body;
    const ticketDoc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!ticketDoc.exists) return res.status(404).json({ error: "Trip ticket not found" });
    const ticket = ticketDoc.data();

    const isAssigned = (ticket.driverIds || []).includes(req.user.uid);
    if (!isAssigned) {
      return res.status(403).json({ error: "You are not assigned as a driver on this trip." });
    }

    await db.collection(COLLECTION).doc(req.params.id).update({
      driverDeclines: FieldValue.arrayUnion({
        driverId: req.user.uid,
        driverName: req.user.name || req.user.email,
        reason: reason || "",
        declinedAt: new Date().toISOString(),
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Notify motorpool/admin so they know to reassign a driver
    sendTripEmail(
      { ...ticket, remarks: `Driver ${req.user.name || req.user.email} declined: ${reason || "no reason given"}` },
      "Driver Declined — Needs Reassignment",
      [ticket.requestorEmail]
    ).catch(() => {});

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

    const ticketDoc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!ticketDoc.exists) return res.status(404).json({ error: "Trip ticket not found" });
    const ticket = ticketDoc.data();

    // Restore each assigned vehicle to available + update odometer
    await Promise.all(
      (ticket.assignments || []).map((a) =>
        db.collection(VEHICLES).doc(a.vehicleId).update({
          currentOdometer: end,
          conditionStatus: "available",
          updatedAt: FieldValue.serverTimestamp(),
        })
      )
    );

    const updates = {
      startKM: start, endKM: end, fuelConsumed: end - start,
      status: "completed", completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTION).doc(req.params.id).update(updates);

    sendTripEmail({ ...ticket, ...updates }, "Completed", [ticket.requestorEmail]).catch(() => {});

    res.json({ success: true, distanceTraveled: end - start });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/trips/:id/reject ── reject request (admin, motorpool)
router.patch("/:id/reject", verifyToken, requireRole("admin", "motorpool"), async (req, res) => {
  try {
    const { reason } = req.body;
    const ticketDoc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!ticketDoc.exists) return res.status(404).json({ error: "Trip ticket not found" });
    const ticket = ticketDoc.data();

    await db.collection(COLLECTION).doc(req.params.id).update({
      status:     "rejected",
      remarks:    reason || "",
      updatedAt:  FieldValue.serverTimestamp(),
    });

    sendTripEmail({ ...ticket, remarks: reason }, "Rejected", [ticket.requestorEmail]).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;