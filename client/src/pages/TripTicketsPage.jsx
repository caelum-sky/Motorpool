// src/pages/TripTicketsPage.jsx
import { useState } from "react";
import { useTripTickets, useVehicles } from "../hooks/useApi";
import { tripsApi } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Card, StatusBadge, Button, Modal, Input, Select, EmptyState, Spinner } from "../components/ui";
import { FileText, Plus, Search, RefreshCw, CheckCircle, XCircle, Flag, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_REQ      = { destination:"", purpose:"", dateTravel:"", timeDepart:"", timeReturn:"", remarks:"" };
const EMPTY_APPROVE  = { vehicleId:"", driverId:"", driverName:"" };
const EMPTY_COMPLETE = { startKM:"", endKM:"" };

export default function TripTicketsPage() {
  const { user, userProfile }               = useAuth();
  const { data: trips, loading, refetch }   = useTripTickets(userProfile);
  const { data: vehicles }                  = useVehicles();
  const [search,       setSearch]           = useState("");
  const [filter,       setFilter]           = useState("");
  const [modal,        setModal]            = useState(null);
  const [selected,     setSelected]         = useState(null);
  const [confirm,      setConfirm]          = useState(null);
  const [form,         setForm]             = useState(EMPTY_REQ);
  const [approveForm,  setApproveForm]      = useState(EMPTY_APPROVE);
  const [completeForm, setCompleteForm]     = useState(EMPTY_COMPLETE);
  const [saving,       setSaving]           = useState(false);

  const canApprove = ["admin","motorpool"].includes(userProfile?.role);

  const filtered = (trips||[]).filter(t => {
    const m = !search || [t.destination,t.purpose,t.requestorName,t.requestorDept]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return m && (!filter || t.status === filter);
  });

  const f  = k => e => setForm(p => ({...p, [k]: e.target.value}));
  const fa = k => e => setApproveForm(p => ({...p, [k]: e.target.value}));
  const fc = k => e => setCompleteForm(p => ({...p, [k]: e.target.value}));

  const submitRequest = async () => {
    if (!form.destination || !form.purpose || !form.dateTravel)
      return toast.error("Destination, purpose, and date required.");

    // Build a safe profile using Firebase Auth as fallback if Firestore profile missing
    const safeProfile = {
      uid:              user?.uid || "unknown",
      name:             userProfile?.name || user?.displayName || user?.email || "Unknown User",
      email:            userProfile?.email || user?.email || "",
      officeDepartment: userProfile?.officeDepartment || "",
      role:             userProfile?.role || "staff",
    };

    setSaving(true);
    try {
      await tripsApi.create(form, safeProfile);
      toast.success("Trip request submitted.");
      setModal(null);
      refetch();
    } catch(err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const approveTrip = async () => {
    if (!approveForm.vehicleId || !approveForm.driverId)
      return toast.error("Vehicle and driver ID required.");
    setSaving(true);
    try {
      await tripsApi.approve(selected.id, approveForm, userProfile?.uid || user?.uid);
      toast.success("Trip approved & vehicle dispatched.");
      setModal(null);
      refetch();
    } catch(err) {
      toast.error(err.message);
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
      toast.success(`Completed. Distance: ${r.distanceTraveled} km`);
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

  const statusCounts = ["pending","approved","completed","rejected"].map(s => ({
    label: s,
    count: (trips||[]).filter(t => t.status === s).length,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trip Tickets</h1>
          <p className="text-sm text-gray-500">{(trips||[]).length} total requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <RefreshCw className="w-4 h-4"/>
          </button>
          <Button onClick={() => { setForm(EMPTY_REQ); setModal("request"); }} variant="primary">
            <Plus className="w-4 h-4"/> New Request
          </Button>
        </div>
      </div>

      {/* Status pill counters */}
      <div className="grid grid-cols-4 gap-3">
        {statusCounts.map(({label,count}) => (
          <button key={label} onClick={() => setFilter(filter===label ? "" : label)}
            className={`text-center p-3 rounded-xl border transition capitalize text-sm font-medium
              ${filter===label
                ? "border-buksu-maroon bg-buksu-maroon/5 text-buksu-maroon"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
            <p className="text-xl font-bold">{count}</p>
            <p className="text-xs">{label}</p>
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
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No trip tickets" description="Submit a new trip request to get started."/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Requestor","Destination","Purpose","Date","Status","Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{t.requestorName}</p>
                      <p className="text-xs text-gray-400">{t.requestorDept}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                      <p className="truncate">{t.destination}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                      <p className="truncate">{t.purpose}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.dateTravel}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status}/></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {t.status==="pending" && canApprove && (
                          <>
                            <button onClick={() => { setSelected(t); setApproveForm(EMPTY_APPROVE); setModal("approve"); }}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
                              <CheckCircle className="w-3 h-3"/> Approve
                            </button>
                            <button onClick={() => rejectTrip(t.id)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
                              <XCircle className="w-4 h-4"/>
                            </button>
                          </>
                        )}
                        {t.status==="approved" && (
                          <button onClick={() => { setSelected(t); setCompleteForm(EMPTY_COMPLETE); setModal("complete"); }}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                            <Flag className="w-3 h-3"/> Complete
                          </button>
                        )}
                        {t.status==="completed" && (
                          <span className="text-xs text-gray-400">{t.startKM}→{t.endKM} km</span>
                        )}
                        {canApprove && (
                          <button onClick={() => setConfirm(t.id)}
                            className="p-1.5 rounded-lg text-red-300 hover:bg-red-50 transition">
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

      {/* New Request Modal */}
      <Modal open={modal==="request"} onClose={() => setModal(null)} title="New Trip Request">
        <div className="space-y-4">
          <Input label="Destination *" value={form.destination} onChange={f("destination")} placeholder="City / Office to visit"/>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Purpose *</label>
            <textarea rows={2} value={form.purpose} onChange={f("purpose")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 resize-none"
              placeholder="Official business, delivery, meeting…"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Travel *" type="date" value={form.dateTravel} onChange={f("dateTravel")} className="col-span-2"/>
            <Input label="Time Depart" type="time" value={form.timeDepart} onChange={f("timeDepart")}/>
            <Input label="Expected Return" type="time" value={form.timeReturn} onChange={f("timeReturn")}/>
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

      {/* Approve Modal */}
      <Modal open={modal==="approve"} onClose={() => setModal(null)} title="Approve Trip & Assign Vehicle">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-800">{selected?.destination}</p>
            <p className="text-xs text-blue-600">{selected?.purpose}</p>
          </div>
          <Select label="Assign Vehicle *" value={approveForm.vehicleId} onChange={fa("vehicleId")}>
            <option value="">Select vehicle…</option>
            {(vehicles||[]).filter(v => v.conditionStatus==="available").map(v => (
              <option key={v.id} value={v.id}>{v.plateNumber} — {v.brand} {v.model}</option>
            ))}
          </Select>
          <Input label="Driver UID *" value={approveForm.driverId} onChange={fa("driverId")} placeholder="Driver's Firebase UID"/>
          <Input label="Driver Name" value={approveForm.driverName} onChange={fa("driverName")} placeholder="Full name"/>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          <Button variant="gold" onClick={approveTrip} disabled={saving}>
            {saving ? "Processing…" : "Approve & Dispatch"}
          </Button>
        </div>
      </Modal>

      {/* Complete Modal */}
      <Modal open={modal==="complete"} onClose={() => setModal(null)} title="Complete Trip — Enter Odometer">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium">{selected?.destination}</p>
            <p className="text-xs text-gray-500">Driver: {selected?.driverName}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
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

      {/* Delete Confirm */}
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