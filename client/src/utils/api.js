// src/utils/api.js
// Direct Firestore SDK layer — replaces Express REST calls.
// Eliminates the "invalid or expired token" error by using
// the Firebase client SDK directly.

import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, runTransaction,
} from "firebase/firestore";
import { db, auth as clientAuth } from "./firebase";

const col  = (name)     => collection(db, name);
const ref  = (name, id) => doc(db, name, id);
const snap = (d)        => ({ id: d.id, ...d.data() });

function normalize(data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    out[k] = (v && typeof v.toDate === "function") ? v.toDate().toISOString() : v;
  }
  return out;
}

/**
 * authedFetch — calls the Express backend with the current user's
 * Firebase ID token attached. Used for operations that require the
 * Admin SDK (creating accounts for others) or server-side business
 * logic (conflict checking, sending emails).
 */
async function authedFetch(path, options = {}) {
  const token = await clientAuth.currentUser.getIdToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ── VEHICLES ──────────────────────────────────────────────────────────────────
export const vehiclesApi = {
  async getAll(filters = {}) {
    let q = query(col("vehicles"), orderBy("plateNumber"));
    if (filters.status) q = query(col("vehicles"), where("conditionStatus", "==", filters.status), orderBy("plateNumber"));
    const s = await getDocs(q);
    return s.docs.map(d => normalize(snap(d)));
  },
  async getOne(id) {
    const d = await getDoc(ref("vehicles", id));
    return d.exists() ? normalize(snap(d)) : null;
  },
  async create(data) {
    const payload = {
      plateNumber:        data.plateNumber || "",
      brand:              data.brand || "",
      model:              data.model || "",
      type:               data.type || "van",
      engineDisplacement: data.engineDisplacement || "",
      currentOdometer:    Number(data.currentOdometer) || 0,
      conditionStatus:    data.conditionStatus || "available",
      assignedDriverId:   data.assignedDriverId || null,
      imageUrl:           data.imageUrl || null,
      notes:              data.notes || "",
      createdAt:          serverTimestamp(),
      updatedAt:          serverTimestamp(),
    };
    const r = await addDoc(col("vehicles"), payload);
    return { id: r.id, ...payload };
  },
  async update(id, data) {
    const payload = { ...data, updatedAt: serverTimestamp() };
    if (payload.currentOdometer !== undefined) payload.currentOdometer = Number(payload.currentOdometer);
    await updateDoc(ref("vehicles", id), payload);
    return { id, ...payload };
  },
  async delete(id) {
    await deleteDoc(ref("vehicles", id));
  },
};

// ── INVENTORY ─────────────────────────────────────────────────────────────────
export const inventoryApi = {
  async getAll(filters = {}) {
    let q = query(col("inventory"), orderBy("itemName"));
    if (filters.category) q = query(col("inventory"), where("category", "==", filters.category), orderBy("itemName"));
    const s = await getDocs(q);
    const items = s.docs.map(d => normalize(snap(d)));
    return filters.lowStock ? items.filter(p => p.stockQty <= p.reorderLevel) : items;
  },
  async getOne(id) {
    const d = await getDoc(ref("inventory", id));
    return d.exists() ? normalize(snap(d)) : null;
  },
  async create(data) {
    const payload = {
      itemName:     data.itemName || "",
      category:     data.category || "spare_parts",
      stockQty:     Number(data.stockQty) || 0,
      reorderLevel: Number(data.reorderLevel) || 5,
      unitCost:     parseFloat(data.unitCost) || 0,
      unit:         data.unit || "piece",
      shelfLocation:data.shelfLocation || "",
      supplier:     data.supplier || "",
      createdAt:    serverTimestamp(),
      updatedAt:    serverTimestamp(),
    };
    const r = await addDoc(col("inventory"), payload);
    return { id: r.id, ...payload };
  },
  async update(id, data) {
    const payload = { ...data, updatedAt: serverTimestamp() };
    if (payload.stockQty     !== undefined) payload.stockQty     = Number(payload.stockQty);
    if (payload.reorderLevel !== undefined) payload.reorderLevel = Number(payload.reorderLevel);
    if (payload.unitCost     !== undefined) payload.unitCost     = parseFloat(payload.unitCost);
    await updateDoc(ref("inventory", id), payload);
    return { id, ...payload };
  },
  async delete(id) {
    await deleteDoc(ref("inventory", id));
  },
  async issuePart({ partId, vehicleId, qtyIssued, technicianName, remarks, issuedByUid, issuedByName }) {
    const partRef = ref("inventory", partId);
    const logRef  = doc(col("issuance_logs"));
    await runTransaction(db, async (t) => {
      const partDoc = await t.get(partRef);
      if (!partDoc.exists()) throw new Error("Part not found");
      const current = partDoc.data().stockQty;
      const qty     = Number(qtyIssued);
      if (current < qty) throw new Error(`Insufficient stock. Available: ${current}`);
      t.update(partRef, { stockQty: current - qty, updatedAt: serverTimestamp() });
      t.set(logRef, {
        partId, itemName: partDoc.data().itemName, vehicleId,
        qtyIssued: qty, unitCost: partDoc.data().unitCost,
        totalCost: partDoc.data().unitCost * qty,
        issuedBy: issuedByUid, issuedByName: issuedByName || "",
        technicianName: technicianName || "", remarks: remarks || "",
        issuedAt: serverTimestamp(),
      });
    });
    return { success: true, logId: logRef.id };
  },
};

// ── TRIP TICKETS ──────────────────────────────────────────────────────────────
// Reads happen via Firestore directly (fast, live). Writes that need
// conflict-checking or email notifications go through the Express
// backend, which owns that business logic.
export const tripsApi = {
  async getAll(userProfile) {
    let q;
    if (userProfile.role === "driver") {
      q = query(col("trip_tickets"), where("driverIds", "array-contains", userProfile.uid), orderBy("createdAt", "desc"), limit(100));
    } else if (userProfile.role === "staff") {
      q = query(col("trip_tickets"), where("requestorId", "==", userProfile.uid), orderBy("createdAt", "desc"), limit(100));
    } else {
      q = query(col("trip_tickets"), orderBy("createdAt", "desc"), limit(100));
    }
    const s = await getDocs(q);
    return s.docs.map(d => normalize(snap(d)));
  },

  async getOne(id) {
    const d = await getDoc(ref("trip_tickets", id));
    return d.exists() ? normalize(snap(d)) : null;
  },

  /** checkConflicts — call before submit/approve to warn the user early. */
  async checkConflicts({ dateTravel, timeDepart, timeReturn, assignments, excludeTicketId }) {
    return authedFetch("/trips/check-conflicts", {
      method: "POST",
      body: JSON.stringify({ dateTravel, timeDepart, timeReturn, assignments, excludeTicketId }),
    });
  },

  /** create — submits a new trip request. Requires passengers[] and numberOfVehicles. */
  async create(data, userProfile) {
    return authedFetch("/trips", {
      method: "POST",
      body: JSON.stringify({
        destination:      data.destination,
        purpose:           data.purpose,
        dateTravel:        data.dateTravel,
        timeDepart:        data.timeDepart || "",
        timeReturn:        data.timeReturn || "",
        passengers:        data.passengers || [],
        numberOfVehicles:  data.numberOfVehicles || 1,
        remarks:           data.remarks || "",
        requestorEmail:    userProfile.email || "",
      }),
    });
  },

  /** approve — assigns one or more {vehicleId, driverId, driverName} pairs. */
  async approve(id, assignments) {
    return authedFetch(`/trips/${id}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ assignments }),
    });
  },

  async complete(id, { startKM, endKM }) {
    return authedFetch(`/trips/${id}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ startKM, endKM }),
    });
  },

  async reject(id, reason) {
    return authedFetch(`/trips/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  },

  /** accept — driver acknowledges they'll take an assigned trip. */
  async accept(id) {
    return authedFetch(`/trips/${id}/accept`, { method: "PATCH" });
  },

  /** decline — driver flags they can't take an assigned trip; motorpool must reassign. */
  async decline(id, reason) {
    return authedFetch(`/trips/${id}/decline`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  },

  async delete(id) {
    await deleteDoc(ref("trip_tickets", id));
  },
};

// ── MAINTENANCE ───────────────────────────────────────────────────────────────
export const maintenanceApi = {
  async getAll(filters = {}) {
    let q = query(col("maintenance_logs"), orderBy("createdAt", "desc"), limit(200));
    if (filters.vehicleId) q = query(col("maintenance_logs"), where("vehicleId", "==", filters.vehicleId), orderBy("createdAt", "desc"));
    const s = await getDocs(q);
    return s.docs.map(d => normalize(snap(d)));
  },
  async create(data, createdByUid) {
    const partsUsed = data.partsUsed || [];
    const partsCost = partsUsed.reduce((s, p) => s + parseFloat(p.unitCost || 0) * Number(p.qtyUsed || 0), 0);
    const laborCost = parseFloat(data.laborCost) || 0;
    const payload = {
      vehicleId: data.vehicleId, maintenanceType: data.maintenanceType || "corrective",
      jobDescription: data.jobDescription, datePerformed: data.datePerformed || new Date().toISOString().split("T")[0],
      technicianName: data.technicianName || "", laborCost, partsUsed, partsCost,
      totalCost: partsCost + laborCost, nextServiceKM: data.nextServiceKM ? Number(data.nextServiceKM) : null,
      status: data.status || "open", remarks: data.remarks || "",
      createdBy: createdByUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    if (data.maintenanceType !== "preventive" && data.status !== "completed") {
      await updateDoc(ref("vehicles", data.vehicleId), { conditionStatus: "maintenance", updatedAt: serverTimestamp() });
    }
    const r = await addDoc(col("maintenance_logs"), payload);
    return { id: r.id, ...payload };
  },
  async update(id, data) {
    const existing  = await getDoc(ref("maintenance_logs", id));
    const prev      = existing.data() || {};
    const partsUsed = data.partsUsed ?? prev.partsUsed ?? [];
    const laborCost = parseFloat(data.laborCost ?? prev.laborCost ?? 0);
    const partsCost = partsUsed.reduce((s, p) => s + parseFloat(p.unitCost || 0) * Number(p.qtyUsed || 0), 0);
    const payload   = { ...data, laborCost, partsCost, totalCost: partsCost + laborCost, updatedAt: serverTimestamp() };
    if (data.status === "completed" && prev.vehicleId) {
      await updateDoc(ref("vehicles", prev.vehicleId), { conditionStatus: "available", updatedAt: serverTimestamp() });
    }
    await updateDoc(ref("maintenance_logs", id), payload);
    return { id, ...payload };
  },
  async delete(id) {
    const d = await getDoc(ref("maintenance_logs", id));
    if (d.exists() && d.data().status !== "completed" && d.data().vehicleId) {
      await updateDoc(ref("vehicles", d.data().vehicleId), { conditionStatus: "available", updatedAt: serverTimestamp() });
    }
    await deleteDoc(ref("maintenance_logs", id));
  },
};

// ── USERS ─────────────────────────────────────────────────────────────────────
// Reading/updating roles can go straight to Firestore (client SDK).
// CREATING a new Auth account for someone else requires the Admin SDK,
// so that one call goes through the Express backend instead.

export const usersApi = {
  async getAll() {
    const s = await getDocs(col("users"));
    // Guarantee every user object has `uid` set to the Firestore doc ID,
    // regardless of whether `uid` was also separately stored as a data
    // field (it should always equal the doc ID, but older/inconsistent
    // records may be missing it — this normalizes that).
    return s.docs.map(d => ({ uid: d.id, ...normalize(d.data()) }));
  },

  /** getDrivers — fetches only users with role "driver", for assignment dropdowns. */
  async getDrivers() {
    const q = query(col("users"), where("role", "==", "driver"));
    const s = await getDocs(q);
    return s.docs.map(d => ({ uid: d.id, ...normalize(d.data()) }));
  },

  async updateRole(uid, role) {
    await updateDoc(ref("users", uid), { role });
  },

  /**
   * create — Admin-only. Creates a brand-new Firebase Auth account
   * plus its Firestore profile for ANY role and office/department.
   * Requires the Express backend (server/routes/users.js) to be running.
   */
  async create({ name, email, password, role, officeDepartment }) {
    return authedFetch("/users", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role, officeDepartment }),
    });
  },

  /** delete — Admin-only. Removes both the Auth account and Firestore profile. */
  async delete(uid) {
    return authedFetch(`/users/${uid}`, { method: "DELETE" });
  },
};