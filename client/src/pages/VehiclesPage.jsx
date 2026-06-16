// src/pages/VehiclesPage.jsx — Full CRUD
import { useState } from "react";
import { useVehicles } from "../hooks/useApi";
import { vehiclesApi } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Card, StatusBadge, Button, Modal, Input, Select, EmptyState, Spinner } from "../components/ui";
import { Truck, Plus, Search, RefreshCw, Gauge, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const VEHICLE_TYPES = ["bus","van","utility","ambulance","motorcycle","pickup"];
const STATUSES      = ["available","dispatched","maintenance","unserviceable"];
const STATUS_BG     = { available:"border-emerald-300 bg-emerald-50", dispatched:"border-blue-300 bg-blue-50", maintenance:"border-yellow-300 bg-yellow-50", unserviceable:"border-red-300 bg-red-50" };
const STATUS_IC     = { available:"text-emerald-500", dispatched:"text-blue-500", maintenance:"text-yellow-500", unserviceable:"text-red-500" };
const EMPTY = { plateNumber:"", brand:"", model:"", type:"van", engineDisplacement:"", currentOdometer:0, conditionStatus:"available", notes:"" };

export default function VehiclesPage() {
  const { userProfile }                        = useAuth();
  const { data: vehicles, loading, refetch }   = useVehicles();
  const [search,  setSearch]                   = useState("");
  const [filter,  setFilter]                   = useState("");
  const [modal,   setModal]                    = useState(null);
  const [editing, setEditing]                  = useState(null);
  const [form,    setForm]                     = useState(EMPTY);
  const [saving,  setSaving]                   = useState(false);
  const [confirm, setConfirm]                  = useState(null); // id to delete

  const canEdit = ["admin","motorpool"].includes(userProfile?.role);

  const filtered = (vehicles||[]).filter(v => {
    const m = !search || [v.plateNumber,v.brand,v.model,v.type].some(f=>f?.toLowerCase().includes(search.toLowerCase()));
    return m && (!filter || v.conditionStatus === filter);
  });

  const openAdd  = () => { setForm(EMPTY); setEditing(null); setModal("form"); };
  const openEdit = (v) => { setForm({ plateNumber:v.plateNumber, brand:v.brand||"", model:v.model, type:v.type, engineDisplacement:v.engineDisplacement||"", currentOdometer:v.currentOdometer||0, conditionStatus:v.conditionStatus, notes:v.notes||"" }); setEditing(v); setModal("form"); };
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const handleSave = async () => {
    if (!form.plateNumber||!form.model) return toast.error("Plate number and model required.");
    setSaving(true);
    try {
      if (editing) { await vehiclesApi.update(editing.id, form); toast.success("Vehicle updated."); }
      else         { await vehiclesApi.create(form);              toast.success("Vehicle added."); }
      setModal(null); refetch();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await vehiclesApi.delete(id); toast.success("Vehicle deleted."); setConfirm(null); refetch(); }
    catch(err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fleet Vehicles</h1>
          <p className="text-sm text-gray-500">{filtered.length} of {(vehicles||[]).length} vehicles</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><RefreshCw className="w-4 h-4"/></button>
          {canEdit && <Button onClick={openAdd} variant="primary"><Plus className="w-4 h-4"/> Add Vehicle</Button>}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="text" placeholder="Search plate, brand, model…" value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40"/>
        </div>
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40">
          <option value="">All statuses</option>
          {STATUSES.map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg"/></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} title="No vehicles found" description="Add a new vehicle to get started."/>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(v=>(
            <div key={v.id} className={`rounded-xl border-2 p-4 transition-shadow hover:shadow-md ${STATUS_BG[v.conditionStatus]||"border-gray-200 bg-white"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg bg-white/70 ${STATUS_IC[v.conditionStatus]}`}><Truck className="w-5 h-5"/></div>
                <StatusBadge status={v.conditionStatus}/>
              </div>
              <p className="font-mono font-bold text-lg text-gray-900 tracking-wide">{v.plateNumber}</p>
              <p className="text-sm text-gray-700 font-medium mt-0.5">{v.brand} {v.model}</p>
              <p className="text-xs text-gray-500 capitalize">{v.type}</p>
              <div className="flex items-center gap-1.5 mt-3 text-gray-600">
                <Gauge className="w-3.5 h-3.5"/>
                <span className="text-xs">{(v.currentOdometer||0).toLocaleString()} km</span>
              </div>
              {v.notes && <p className="text-xs text-gray-400 mt-1 truncate">{v.notes}</p>}
              {canEdit && (
                <div className="flex gap-1.5 mt-3">
                  <button onClick={()=>openEdit(v)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white/60 transition text-xs font-medium">
                    <Edit className="w-3.5 h-3.5"/> Edit
                  </button>
                  <button onClick={()=>setConfirm(v.id)}
                    className="p-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal==="form"} onClose={()=>setModal(null)} title={editing?`Edit ${editing.plateNumber}`:"Add New Vehicle"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Plate Number *" value={form.plateNumber} onChange={f("plateNumber")} placeholder="ABC 123"/>
          <Input label="Brand" value={form.brand} onChange={f("brand")} placeholder="Toyota"/>
          <Input label="Model *" value={form.model} onChange={f("model")} placeholder="HiAce Commuter" className="col-span-2"/>
          <Select label="Type *" value={form.type} onChange={f("type")}>
            {VEHICLE_TYPES.map(t=><option key={t} value={t} className="capitalize">{t}</option>)}
          </Select>
          <Select label="Status" value={form.conditionStatus} onChange={f("conditionStatus")}>
            {STATUSES.map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
          </Select>
          <Input label="Engine Displacement" value={form.engineDisplacement} onChange={f("engineDisplacement")} placeholder="2.7L"/>
          <Input label="Current Odometer (km)" type="number" value={form.currentOdometer} onChange={f("currentOdometer")}/>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={f("notes")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 resize-none"
              placeholder="Additional remarks…"/>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={()=>setModal(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving?"Saving…":editing?"Save Changes":"Add Vehicle"}</Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Delete Vehicle?" size="sm">
        <p className="text-sm text-gray-600">This action cannot be undone. The vehicle record will be permanently removed.</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={()=>setConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={()=>handleDelete(confirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}