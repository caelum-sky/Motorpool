// src/utils/api.js
// Direct Firestore SDK layer — replaces Express REST calls.
// Eliminates the "invalid or expired token" error by using
// the Firebase client SDK directly.

import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";

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
export const tripsApi = {
  async getAll(userProfile) {
    let q;
    if (userProfile.role === "driver") {
      q = query(col("trip_tickets"), where("driverId", "==", userProfile.uid), orderBy("createdAt", "desc"), limit(100));
    } else if (userProfile.role === "staff") {
      q = query(col("trip_tickets"), where("requestorId", "==", userProfile.uid), orderBy("createdAt", "desc"), limit(100));
    } else {
      q = query(col("trip_tickets"), orderBy("createdAt", "desc"), limit(100));
    }
    const s = await getDocs(q);
    return s.docs.map(d => normalize(snap(d)));
  },
  async create(data, userProfile) {
    const payload = {
      requestorId: userProfile.uid, requestorName: userProfile.name || userProfile.email,
      requestorDept: userProfile.officeDepartment || "",
      destination: data.destination, purpose: data.purpose, dateTravel: data.dateTravel,
      timeDepart: data.timeDepart || "", timeReturn: data.timeReturn || "",
      passengers: data.passengers || [], vehiclePreference: data.vehiclePreference || null,
      vehicleId: null, driverId: null, driverName: null,
      startKM: null, endKM: null, fuelConsumed: null,
      remarks: data.remarks || "", status: "pending",
      approvedBy: null, approvedAt: null, completedAt: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    const r = await addDoc(col("trip_tickets"), payload);
    return { id: r.id, ...payload };
  },
  async approve(id, { vehicleId, driverId, driverName }, approvedByUid) {
    await updateDoc(ref("vehicles", vehicleId), { conditionStatus: "dispatched", updatedAt: serverTimestamp() });
    await updateDoc(ref("trip_tickets", id), {
      vehicleId, driverId, driverName: driverName || "", status: "approved",
      approvedBy: approvedByUid, approvedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  },
  async complete(id, { startKM, endKM }) {
    const start = Number(startKM), end = Number(endKM);
    if (end < start) throw new Error("End KM must be ≥ Start KM");
    const ticketDoc = await getDoc(ref("trip_tickets", id));
    const { vehicleId } = ticketDoc.data();
    if (vehicleId) {
      await updateDoc(ref("vehicles", vehicleId), { currentOdometer: end, conditionStatus: "available", updatedAt: serverTimestamp() });
    }
    await updateDoc(ref("trip_tickets", id), {
      startKM: start, endKM: end, fuelConsumed: end - start,
      status: "completed", completedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return { distanceTraveled: end - start };
  },
  async reject(id, reason) {
    await updateDoc(ref("trip_tickets", id), { status: "rejected", remarks: reason || "", updatedAt: serverTimestamp() });
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
import { auth as clientAuth } from "./firebase";

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

export const usersApi = {
  async getAll() {
    const s = await getDocs(col("users"));
    return s.docs.map(d => normalize(snap(d)));
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
