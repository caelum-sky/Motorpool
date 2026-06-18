// src/pages/TripTicketsPage.jsx
// Digital trip ticket workflow: submit (with required passengers and
// vehicle count) → approve (assign N vehicle+driver pairs, with
// double-booking prevention) → complete (odometer readings) → print.

import { useState }   from "react";
import { useTripTickets, useVehicles, useDrivers } from "../hooks/useApi";
import { tripsApi }   from "../utils/api";
import { useAuth }    from "../context/AuthContext";
import { Card, StatusBadge, Button, Modal, Input, Select, EmptyState, Spinner } from "../components/ui";
import TripTicketPrint from "../components/trips/TripTicketPrint";
import {
  FileText, Plus, Search, RefreshCw, CheckCircle, XCircle, Flag,
  Trash2, Printer, UserPlus, X, AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_REQ      = { destination:"", purpose:"", dateTravel:"", timeDepart:"", timeReturn:"", numberOfVehicles:1, remarks:"" };
const EMPTY_PASSENGER = { name:"", designation:"" };
const EMPTY_COMPLETE = { startKM:"", endKM:"" };

export default function TripTicketsPage() {
  const { user, userProfile }               = useAuth();
  const { data: trips, loading, error: tripsError, refetch }   = useTripTickets(userProfile);
  const { data: vehicles }                  = useVehicles();
  const { data: drivers }                   = useDrivers();

  const [search,        setSearch]          = useState("");
  const [filter,        setFilter]          = useState("");
  const [modal,         setModal]           = useState(null);
  const [selected,      setSelected]        = useState(null);
  const [confirm,       setConfirm]         = useState(null);
  const [printTicket,   setPrintTicket]     = useState(null);
  const [printCopy,     setPrintCopy]       = useState("Driver's Copy");

  const [form,          setForm]            = useState(EMPTY_REQ);
  const [passengers,    setPassengers]      = useState([{ ...EMPTY_PASSENGER }]);
  const [assignments,   setAssignments]     = useState([{ vehicleId:"", driverId:"" }]);
  const [completeForm,  setCompleteForm]    = useState(EMPTY_COMPLETE);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [saving,        setSaving]          = useState(false);
  const [checking,      setChecking]        = useState(false);

  const canApprove = ["admin","motorpool"].includes(userProfile?.role);
  const isDriver   = userProfile?.role === "driver";

  const hasAccepted = (t) => (t.driverAcceptances || []).some(a => a.driverId === user?.uid);
  const hasDeclined = (t) => (t.driverDeclines || []).some(d => d.driverId === user?.uid);

  const filtered = (trips||[]).filter(t => {
    const m = !search || [t.destination,t.purpose,t.requestorName,t.requestorDept]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return m && (!filter || t.status === filter);
  });

  const f  = k => e => setForm(p => ({...p, [k]: e.target.value}));
  const fc = k => e => setCompleteForm(p => ({...p, [k]: e.target.value}));

  // ── Passenger row helpers ─────────────────────────────────────────────────
  const updatePassenger = (i, key, val) => setPassengers(p => p.map((x,idx) => idx===i ? {...x,[key]:val} : x));
  const addPassenger     = () => setPassengers(p => [...p, { ...EMPTY_PASSENGER }]);
  const removePassenger  = (i) => setPassengers(p => p.filter((_,idx) => idx!==i));

  // ── Assignment row helpers (vehicle + driver pairs) ──────────────────────
  const updateAssignment = (i, key, val) => setAssignments(a => a.map((x,idx) => idx===i ? {...x,[key]:val} : x));
  const syncAssignmentCount = (count) => {
    setAssignments(prev => {
      const next = [...prev];
      while (next.length < count) next.push({ vehicleId:"", driverId:"" });
      while (next.length > count) next.pop();
      return next;
    });
  };

  // ── New request modal ─────────────────────────────────────────────────────
  const openRequestModal = () => {
    setForm(EMPTY_REQ);
    setPassengers([{ ...EMPTY_PASSENGER }]);
    setConflictWarning(null);
    setModal("request");
  };

  const submitRequest = async () => {
    if (!form.destination || !form.purpose || !form.dateTravel)
      return toast.error("Destination, purpose, and date are required.");

    const validPassengers = passengers.filter(p => p.name.trim());
    if (validPassengers.length === 0)
      return toast.error("At least one passenger must be specified.");

    const safeProfile = {
      uid:              user?.uid || "unknown",
      name:             userProfile?.name || user?.displayName || user?.email || "Unknown User",
      email:            userProfile?.email || user?.email || "",
      officeDepartment: userProfile?.officeDepartment || "",
      role:             userProfile?.role || "staff",
    };

    setSaving(true);
    try {
      await tripsApi.create({ ...form, passengers: validPassengers }, safeProfile);
      toast.success("Trip request submitted. A confirmation email has been sent.");
      setModal(null);
      refetch();
    } catch(err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Approve modal ─────────────────────────────────────────────────────────
  const openApproveModal = (t) => {
    setSelected(t);
    syncAssignmentCount(t.numberOfVehicles || 1);
    setConflictWarning(null);
    setModal("approve");
  };

  const checkConflictsNow = async () => {
    if (!selected) return;
    const candidates = assignments
      .filter(a => a.vehicleId)
      .map(a => {
        const v = (vehicles||[]).find(v => v.id === a.vehicleId);
        const d = (drivers||[]).find(d => d.uid === a.driverId);
        return { vehicleId: a.vehicleId, plateNumber: v?.plateNumber, driverId: a.driverId, driverName: d?.name };
      });
    if (candidates.length === 0) return;

    setChecking(true);
    try {
      const result = await tripsApi.checkConflicts({
        dateTravel: selected.dateTravel,
        timeDepart: selected.timeDepart,
        timeReturn: selected.timeReturn,
        assignments: candidates,
        excludeTicketId: selected.id,
      });
      setConflictWarning(result.hasConflicts ? result.conflicts : null);
    } catch(err) {
      toast.error(err.message);
    } finally {
      setChecking(false);
    }
  };

  const approveTrip = async () => {
    const incomplete = assignments.some(a => !a.vehicleId || !a.driverId);
    if (incomplete) return toast.error("Every row needs a vehicle and a driver selected.");

    const driverIds  = assignments.map(a => a.driverId).filter(Boolean);
    const vehicleIds = assignments.map(a => a.vehicleId).filter(Boolean);
    const hasDuplicateDriver  = driverIds.length !== new Set(driverIds).size;
    const hasDuplicateVehicle = vehicleIds.length !== new Set(vehicleIds).size;

    if (hasDuplicateDriver) {
      return toast.error("The same driver is assigned to more than one vehicle on this ticket. One person cannot drive two vehicles at the same time.");
    }
    if (hasDuplicateVehicle) {
      return toast.error("The same vehicle is assigned more than once on this ticket.");
    }

    const resolved = assignments.map(a => {
      const d = (drivers||[]).find(d => d.uid === a.driverId);
      return { vehicleId: a.vehicleId, driverId: a.driverId, driverName: d?.name || "" };
    });

    setSaving(true);
    try {
      await tripsApi.approve(selected.id, resolved);
      toast.success("Trip approved, vehicle(s) dispatched, and drivers notified by email.");
      setModal(null);
      refetch();
    } catch(err) {
      if (err.message.includes("conflict") || err.message.includes("Conflict")) {
        toast.error("Scheduling conflict — one driver may have been assigned to more than one vehicle, or a vehicle/driver is already booked elsewhere at this time.");
      } else {
        toast.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const completeTrip = async () => {
    if (!completeForm.startKM || !completeForm.endKM)
      return toast.error("Start and end KM required.");
    setSaving(true);
    try {
      const r = await tripsApi.complete(selected.id, completeForm);
      toast.success(`Trip completed. Distance: ${r.distanceTraveled} km.`);
      setModal(null);
      refetch();
    } catch(err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const rejectTrip = async (id) => {
    try {
      await tripsApi.reject(id, "Rejected by motorpool.");
      toast.success("Request rejected.");
      refetch();
    } catch(err) {
      toast.error(err.message);
    }
  };

  const acceptTrip = async (id) => {
    try {
      await tripsApi.accept(id);
      toast.success("Trip accepted. Drive safe!");
      refetch();
    } catch(err) {
      toast.error(err.message);
    }
  };

  const declineTrip = async (id) => {
    const reason = window.prompt("Why are you declining this trip? (this helps motorpool reassign quickly)");
    if (reason === null) return; // cancelled prompt
    try {
      await tripsApi.decline(id, reason);
      toast.success("Trip declined. Motorpool has been notified to reassign.");
      refetch();
    } catch(err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await tripsApi.delete(id);
      toast.success("Trip ticket deleted.");
      setConfirm(null);
      refetch();
    } catch(err) {
      toast.error(err.message);
    }
  };

  const openPrint = (t, copy) => {
    setPrintTicket(t);
    setPrintCopy(copy);
    setModal("print");
  };

  const handlePrintNow = () => {
    window.print();
  };

  const statusCounts = ["pending","approved","completed","rejected"].map(s => ({
    label: s, count: (trips||[]).filter(t => t.status === s).length,
  }));

  const availableVehicles = (vehicles||[]).filter(v => v.conditionStatus === "available");

  return (
    <div className="space-y-5">
      {tripsError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-semibold">Couldn't load trip tickets.</p>
          <p className="text-xs mt-1">{tripsError}</p>
          {tripsError.toLowerCase().includes("permission") && (
            <p className="text-xs mt-1">
              This usually means the Firestore security rules haven't been deployed yet.
              Ask your administrator to publish <code className="bg-red-100 px-1 rounded">firestore.rules</code> in
              Firebase Console → Firestore Database → Rules.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trip Tickets</h1>
          <p className="text-sm text-gray-500">{(trips||[]).length} total requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <RefreshCw className="w-4 h-4"/>
          </button>
          <Button onClick={openRequestModal} variant="primary">
            <Plus className="w-4 h-4"/> New Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statusCounts.map(({label,count}) => (
          <button key={label} onClick={() => setFilter(filter===label ? "" : label)}
            className={`text-center p-3 rounded-xl border transition capitalize text-sm font-medium
              ${filter===label ? "border-buksu-maroon bg-buksu-maroon/5 text-buksu-maroon" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
            <p className="text-xl font-bold">{count}</p><p className="text-xs">{label}</p>
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input type="text" placeholder="Search destination, requestor…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40"/>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg"/></div>
        ) : filtered.length===0 ? (
          <EmptyState icon={FileText} title="No trip tickets" description="Submit a new trip request to get started."/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["Requestor","Destination","Date","Passengers","Vehicles","Status","Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{t.requestorName}</p>
                      <p className="text-xs text-gray-400">{t.requestorDept}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs"><p className="truncate">{t.destination}</p></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.dateTravel}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{t.passengers?.length || 0}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{t.numberOfVehicles || t.assignments?.length || 1}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status}/></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {t.status==="pending" && canApprove && (
                          <>
                            <button onClick={() => openApproveModal(t)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
                              <CheckCircle className="w-3 h-3"/> Approve
                            </button>
                            <button onClick={() => rejectTrip(t.id)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
                              <XCircle className="w-4 h-4"/>
                            </button>
                          </>
                        )}
                        {t.status==="approved" && isDriver && !hasAccepted(t) && !hasDeclined(t) && (
                          <>
                            <button onClick={() => acceptTrip(t.id)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
                              <CheckCircle className="w-3 h-3"/> Accept
                            </button>
                            <button onClick={() => declineTrip(t.id)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition">
                              <XCircle className="w-3 h-3"/> Decline
                            </button>
                          </>
                        )}
                        {t.status==="approved" && isDriver && hasAccepted(t) && (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3"/> Accepted
                          </span>
                        )}
                        {t.status==="approved" && isDriver && hasDeclined(t) && (
                          <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <XCircle className="w-3 h-3"/> Declined
                          </span>
                        )}
                        {t.status==="approved" && (
                          <button onClick={() => { setSelected(t); setCompleteForm(EMPTY_COMPLETE); setModal("complete"); }}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                            <Flag className="w-3 h-3"/> Complete
                          </button>
                        )}
                        {(t.status==="approved" || t.status==="completed") && (
                          <>
                            <button onClick={() => openPrint(t, "Driver's Copy")}
                              title="Print driver's copy"
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition">
                              <Printer className="w-3.5 h-3.5"/>
                            </button>
                          </>
                        )}
                        {canApprove && (
                          <button onClick={() => setConfirm(t.id)} className="p-1.5 rounded-lg text-red-300 hover:bg-red-50 transition">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── New Request Modal ──────────────────────────────────────────────── */}
      <Modal open={modal==="request"} onClose={() => setModal(null)} title="New Trip Request" size="lg">
        <div className="space-y-4">
          <Input label="Destination *" value={form.destination} onChange={f("destination")} placeholder="City / Office to visit"/>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Purpose *</label>
            <textarea rows={2} value={form.purpose} onChange={f("purpose")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 resize-none"
              placeholder="Official business, delivery, meeting…"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date of Travel *" type="date" value={form.dateTravel} onChange={f("dateTravel")} className="col-span-2"/>
            <Input label="Time Depart" type="time" value={form.timeDepart} onChange={f("timeDepart")}/>
            <Input label="Expected Return" type="time" value={form.timeReturn} onChange={f("timeReturn")}/>
          </div>

          <Input label="Number of Vehicles Needed *" type="number" min={1} max={10}
            value={form.numberOfVehicles} onChange={f("numberOfVehicles")}/>

          {/* Passengers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-600">Passengers *</label>
              <button type="button" onClick={addPassenger}
                className="text-xs text-buksu-maroon font-medium flex items-center gap-1 hover:underline">
                <UserPlus className="w-3 h-3"/> Add passenger
              </button>
            </div>
            <div className="space-y-2">
              {passengers.map((p,i) => (
                <div key={i} className="flex gap-2">
                  <input value={p.name} onChange={e => updatePassenger(i,"name",e.target.value)}
                    placeholder="Full name" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40"/>
                  <input value={p.designation} onChange={e => updatePassenger(i,"designation",e.target.value)}
                    placeholder="Designation" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40"/>
                  {passengers.length>1 && (
                    <button type="button" onClick={() => removePassenger(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                      <X className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Input label="Remarks" value={form.remarks} onChange={f("remarks")} placeholder="Additional notes…"/>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          <Button variant="primary" onClick={submitRequest} disabled={saving}>
            {saving ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </Modal>

      {/* ── Approve Modal (multi-vehicle) ──────────────────────────────────── */}
      <Modal open={modal==="approve"} onClose={() => setModal(null)} title="Approve Trip & Assign Vehicles" size="lg">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-800">{selected?.destination}</p>
            <p className="text-xs text-blue-600">{selected?.purpose}</p>
            <p className="text-xs text-blue-500 mt-1">
              {selected?.dateTravel} · {selected?.timeDepart || "—"}–{selected?.timeReturn || "—"} ·
              {" "}{selected?.passengers?.length || 0} passenger(s) · {selected?.numberOfVehicles || 1} vehicle(s) needed
            </p>
          </div>

          <div className="space-y-3">
            {assignments.map((a,i) => {
              const driverIdsUsedElsewhere = assignments
                .filter((_, idx) => idx !== i)
                .map(x => x.driverId)
                .filter(Boolean);
              const vehicleIdsUsedElsewhere = assignments
                .filter((_, idx) => idx !== i)
                .map(x => x.vehicleId)
                .filter(Boolean);

              const isDuplicateDriver  = a.driverId && driverIdsUsedElsewhere.includes(a.driverId);
              const isDuplicateVehicle = a.vehicleId && vehicleIdsUsedElsewhere.includes(a.vehicleId);

              return (
                <div key={i} className={`border rounded-lg p-3 ${(isDuplicateDriver || isDuplicateVehicle) ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                  <p className="text-xs font-medium text-gray-500 mb-2">Vehicle {i+1}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select label="Vehicle" value={a.vehicleId} onChange={e => updateAssignment(i,"vehicleId",e.target.value)}>
                      <option value="">Select vehicle…</option>
                      {availableVehicles.map(v => (
                        <option key={v.id} value={v.id} disabled={vehicleIdsUsedElsewhere.includes(v.id)}>
                          {v.plateNumber} — {v.brand} {v.model}{vehicleIdsUsedElsewhere.includes(v.id) ? " (already used above)" : ""}
                        </option>
                      ))}
                    </Select>
                    <Select label="Driver" value={a.driverId} onChange={e => updateAssignment(i,"driverId",e.target.value)}>
                      <option value="">Select driver…</option>
                      {(drivers||[]).map(d => (
                        <option key={d.uid} value={d.uid} disabled={driverIdsUsedElsewhere.includes(d.uid)}>
                          {d.name}{driverIdsUsedElsewhere.includes(d.uid) ? " (already assigned above)" : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {isDuplicateDriver && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠ This driver is already assigned to another vehicle on this ticket — one person cannot drive two vehicles at the same time.
                    </p>
                  )}
                  {isDuplicateVehicle && (
                    <p className="text-xs text-red-600 mt-2">⚠ This vehicle is already assigned to another row on this ticket.</p>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" onClick={checkConflictsNow} disabled={checking}
            className="text-xs text-buksu-maroon font-medium hover:underline flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5"/> {checking ? "Checking…" : "Check for scheduling conflicts"}
          </button>

          {conflictWarning && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              <p className="font-semibold mb-1">⚠ Conflicts found — cannot use as-is:</p>
              <ul className="list-disc pl-4 space-y-1">
                {conflictWarning.map((c,i) => (
                  <li key={i}>
                    {c.plateNumber && <span className="font-mono">{c.plateNumber}</span>}
                    {c.driverName && ` / ${c.driverName}`} — {c.reason}
                    {c.destination ? ` (already on a trip to ${c.destination}, ${c.timeDepart||"—"}–${c.timeReturn||"—"})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          <Button variant="gold" onClick={approveTrip} disabled={saving}>
            {saving ? "Processing…" : "Approve & Dispatch"}
          </Button>
        </div>
      </Modal>

      {/* ── Complete Modal ──────────────────────────────────────────────────── */}
      <Modal open={modal==="complete"} onClose={() => setModal(null)} title="Complete Trip — Enter Odometer">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium">{selected?.destination}</p>
            <p className="text-xs text-gray-500">
              {selected?.assignments?.map(a => a.driverName).filter(Boolean).join(", ") || "No driver recorded"}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Start Odometer (km) *" type="number" value={completeForm.startKM} onChange={fc("startKM")}/>
            <Input label="End Odometer (km) *" type="number" value={completeForm.endKM} onChange={fc("endKM")}/>
          </div>
          {completeForm.startKM && completeForm.endKM && Number(completeForm.endKM) >= Number(completeForm.startKM) && (
            <div className="bg-buksu-maroon/5 rounded-lg p-3 border border-buksu-maroon/20">
              <p className="text-xs text-gray-500">Distance Traveled</p>
              <p className="text-xl font-bold text-buksu-maroon">
                {(Number(completeForm.endKM) - Number(completeForm.startKM)).toLocaleString()} km
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          <Button variant="primary" onClick={completeTrip} disabled={saving}>
            {saving ? "Saving…" : "Mark as Completed"}
          </Button>
        </div>
      </Modal>

      {/* ── Print Modal ─────────────────────────────────────────────────────── */}
      <Modal open={modal==="print"} onClose={() => setModal(null)} title="Print Trip Ticket" size="xl">
        <div className="flex gap-2 mb-4 no-print">
          {["Driver's Copy","Requestor's Copy"].map(label => (
            <button key={label} onClick={() => setPrintCopy(label)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${printCopy===label ? "bg-buksu-maroon text-white border-buksu-maroon" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
              {label}
            </button>
          ))}
          <Button variant="primary" size="sm" onClick={handlePrintNow} className="ml-auto">
            <Printer className="w-3.5 h-3.5"/> Print Now
          </Button>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-2">
          <TripTicketPrint ticket={printTicket} copyLabel={printCopy} />
        </div>
      </Modal>

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete Trip Ticket?" size="sm">
        <p className="text-sm text-gray-600">This will permanently delete this trip record.</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => handleDelete(confirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}