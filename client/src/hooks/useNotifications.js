// src/hooks/useNotifications.js
// Derives in-app notifications from existing Firestore data.
// All queries use simple single-field filters (no orderBy) to avoid
// composite index requirements — sorting is done client-side instead.

import { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../utils/firebase";

const col = (name) => collection(db, name);

// Sort an array of items by time descending (client-side, no index needed)
function byTimeDesc(items) {
  return [...items].sort((a, b) => new Date(b.time) - new Date(a.time));
}

export function useNotifications(user, userProfile) {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.uid || !userProfile?.role) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = [];
      const { role, uid: profileUid } = userProfile;
      const uid = user.uid;

      // ── ADMIN / MOTORPOOL ──────────────────────────────────────────────
      if (role === "admin" || role === "motorpool") {

        // 1. Pending trip requests (single where — no composite index needed)
        try {
          const snap = await getDocs(
            query(col("trip_tickets"), where("status", "==", "pending"), limit(50))
          );
          snap.docs.forEach(d => {
            const t = d.data();
            items.push({
              id:       `trip-pending-${d.id}`,
              type:     "pending_trip",
              title:    "Trip Request Awaiting Approval",
              message:  `${t.requestorName || t.requestorEmail || "Someone"} → ${t.destination || "Unknown destination"}`,
              time:     t.createdAt?.toDate?.() ?? new Date(),
              link:     "/trips",
              priority: "high",
            });
          });
        } catch (e) { console.warn("Notif: pending trips query failed:", e.message); }

        // 2. Low stock inventory (full scan — inventory collection is small)
        try {
          const snap = await getDocs(col("inventory"));
          snap.docs.forEach(d => {
            const item = d.data();
            const qty  = Number(item.quantity  ?? item.stock ?? 0);
            const min  = Number(item.minimumStock ?? item.minStock ?? 0);
            if (qty <= min) {
              items.push({
                id:       `low-stock-${d.id}`,
                type:     "low_stock",
                title:    "Low Stock Alert",
                message:  `${item.itemName || item.name} — ${qty} ${item.unit || "units"} left (min: ${min})`,
                time:     new Date(),
                link:     "/inventory",
                priority: "medium",
              });
            }
          });
        } catch (e) { console.warn("Notif: inventory query failed:", e.message); }

        // 3. Open / in-progress job orders
        try {
          const openSnap = await getDocs(
            query(col("maintenance_logs"), where("status", "==", "open"), limit(20))
          );
          const inProgSnap = await getDocs(
            query(col("maintenance_logs"), where("status", "==", "in_progress"), limit(20))
          );
          [...openSnap.docs, ...inProgSnap.docs].forEach(d => {
            const m = d.data();
            items.push({
              id:       `maint-${d.id}`,
              type:     "maintenance",
              title:    `Job Order ${m.status === "in_progress" ? "In Progress" : "Open"}`,
              message:  `${m.vehicleName || m.vehicleId || "Vehicle"} — ${(m.jobDescription || m.description || "Maintenance work").slice(0, 60)}`,
              time:     m.createdAt?.toDate?.() ?? new Date(),
              link:     "/maintenance",
              priority: "low",
            });
          });
        } catch (e) { console.warn("Notif: maintenance query failed:", e.message); }

        // 4. Approved trips where a driver declined — needs reassignment
        try {
          const snap = await getDocs(
            query(col("trip_tickets"), where("status", "==", "approved"), limit(50))
          );
          snap.docs.forEach(d => {
            const t = d.data();
            if ((t.driverDeclines || []).length > 0) {
              items.push({
                id:       `declined-${d.id}`,
                type:     "driver_declined",
                title:    "Driver Declined — Reassignment Needed",
                message:  `Trip to ${t.destination || "Unknown"} — a driver declined`,
                time:     new Date(),
                link:     "/trips",
                priority: "high",
              });
            }
          });
        } catch (e) { console.warn("Notif: declined trips query failed:", e.message); }
      }

      // ── DRIVER ────────────────────────────────────────────────────────
      if (role === "driver") {
        // Trips assigned to this driver not yet accepted/declined
        try {
          const snap = await getDocs(
            query(
              col("trip_tickets"),
              where("driverIds", "array-contains", uid),
              where("status", "==", "approved"),
              limit(30)
            )
          );
          snap.docs.forEach(d => {
            const t = d.data();
            const accepted = (t.driverAcceptances || []).some(a => a.driverId === uid);
            const declined = (t.driverDeclines    || []).some(a => a.driverId === uid);
            if (!accepted && !declined) {
              items.push({
                id:       `assigned-${d.id}`,
                type:     "assigned_trip",
                title:    "Trip Assignment — Action Required",
                message:  `Drive to ${t.destination || "Unknown"} on ${t.dateTravel || "TBD"}`,
                time:     t.approvedAt?.toDate?.() ?? t.createdAt?.toDate?.() ?? new Date(),
                link:     "/trips",
                priority: "high",
              });
            }
          });
        } catch (e) { console.warn("Notif: driver assigned trips query failed:", e.message); }
      }

      // ── STAFF ─────────────────────────────────────────────────────────
      if (role === "staff") {
        // Status updates on this user's own trip requests
        try {
          const snap = await getDocs(
            query(col("trip_tickets"), where("requestorId", "==", uid), limit(30))
          );
          snap.docs.forEach(d => {
            const t = d.data();
            if (t.status === "approved") {
              items.push({
                id:       `approved-${d.id}`,
                type:     "trip_approved",
                title:    "Trip Request Approved ✓",
                message:  `Your trip to ${t.destination || "Unknown"} on ${t.dateTravel || "TBD"} was approved`,
                time:     t.approvedAt?.toDate?.() ?? t.updatedAt?.toDate?.() ?? new Date(),
                link:     "/trips",
                priority: "high",
              });
            } else if (t.status === "rejected") {
              items.push({
                id:       `rejected-${d.id}`,
                type:     "trip_rejected",
                title:    "Trip Request Rejected",
                message:  `Your trip to ${t.destination || "Unknown"} was not approved`,
                time:     t.updatedAt?.toDate?.() ?? new Date(),
                link:     "/trips",
                priority: "medium",
              });
            } else if (t.status === "completed") {
              items.push({
                id:       `completed-${d.id}`,
                type:     "trip_completed",
                title:    "Trip Completed",
                message:  `Trip to ${t.destination || "Unknown"} on ${t.dateTravel || "TBD"} completed`,
                time:     t.updatedAt?.toDate?.() ?? new Date(),
                link:     "/trips",
                priority: "low",
              });
            }
          });
        } catch (e) { console.warn("Notif: staff trips query failed:", e.message); }
      }

      // Sort: high → medium → low, then newest first within each group
      const order = { high: 0, medium: 1, low: 2 };
      items.sort((a, b) => {
        const pd = order[a.priority] - order[b.priority];
        return pd !== 0 ? pd : new Date(b.time) - new Date(a.time);
      });

      setNotifications(items.slice(0, 30));
    } catch (err) {
      console.error("useNotifications error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, userProfile?.role]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return { notifications, loading, error, refetch: fetchNotifications };
}