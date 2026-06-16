// src/pages/MaintenancePage.jsx — Full CRUD
import { useState } from "react";
import { useMaintenance, useVehicles } from "../hooks/useApi";
import { maintenanceApi } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Card, StatusBadge, Button, Modal, Input, Select, EmptyState, Spinner } from "../components/ui";
import { Wrench, Plus, RefreshCw, Search, CheckCircle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const TYPES    = ["preventive","corrective","emergency"];
const STATUSES = ["open","in_progress","completed"];
const EMPTY    = { vehicleId:"", maintenanceType:"preventive", jobDescription:"", datePerformed:new Date().toISOString().split("T")[0], technicianName:"", laborCost:0, nextServiceKM:"", status:"open", remarks:"" };

export default function MaintenancePage() {
  const { userProfile }                      = useAuth();
  const { data: logs, loading, refetch }     = useMaintenance();
  const { data: vehicles }                   = useVehicles();
  const [search,  setSearch]                 = useState("");
  const [filter,  setFilter]                 = useState("");
  const [modal,   setModal]                  = useState(null);
  const [editing, setEditing]                = useState(null);
  const [confirm, setConfirm]                = useState(null);
  const [form,    setForm]                   = useState(EMPTY);
  const [saving,  setSaving]                 = useState(false);

  const filtered = (logs||[]).filter(l => {
    const m = !search || [l.jobDescription,l.technicianName,l.vehicleId].some(f=>f?.toLowerCase().includes(search.toLowerCase()));
    return m && (!filter||l.status===filter||l.maintenanceType===filter);
  });

  const openAdd  = () => { setForm(EMPTY); setEditing(null); setModal("form"); };
  const openEdit = (l) => { setForm({ vehicleId:l.vehicleId, maintenanceType:l.maintenanceType, jobDescription:l.jobDescription, datePerformed:l.datePerformed, technicianName:l.technicianName||"", laborCost:l.laborCost||0, nextServiceKM:l.nextServiceKM||"", status:l.status, remarks:l.remarks||"" }); setEditing(l); setModal("form"); };
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const handleSave = async () => {
    if (!form.vehicleId||!form.jobDescription) return toast.error("Vehicle and job description required.");
    setSaving(true);
    try {
      const payload = { ...form, laborCost:parseFloat(form.laborCost)||0 };
      if (editing) { await maintenanceApi.update(editing.id, payload); toast.success("Job order updated."); }
      else         { await maintenanceApi.create(payload, userProfile?.uid); toast.success("Job order created."); }
      setModal(null); refetch();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await maintenanceApi.delete(id); toast.success("Job order deleted."); setConfirm(null); refetch(); }
    catch(err) { toast.error(err.message); }
  };

  const markComplete = async (l) => {
    try { await maintenanceApi.update(l.id, { ...l, status:"completed" }); toast.success("Completed. Vehicle set to available."); refetch(); }
    catch(err) { toast.error(err.message); }
  };

  const vehicleLabel = id => {
    const v = (vehicles||[]).find(v=>v.id===id);
    return v ? `${v.plateNumber} ${v.model}` : id?.slice(-6)||"—";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Maintenance & Job Orders</h1>
          <p className="text-sm text-gray-500">{(logs||[]).length} records</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><RefreshCw className="w-4 h-4"/></button>
          <Button onClick={openAdd} variant="primary"><Plus className="w-4 h-4"/> New Job Order</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="text" placeholder="Search job orders…" value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40"/>
        </div>
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40">
          <option value="">All</option>
          {[...TYPES,...STATUSES].map(s=><option key={s} value={s} className="capitalize">{s.replace(/_/g," ")}</option>)}
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg"/></div>
        ) : filtered.length===0 ? (
          <EmptyState icon={Wrench} title="No job orders" description="Create a new maintenance record."/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["Vehicle","Type","Description","Date","Technician","Labor","Parts","Total","Status","Actions"].map(h=>(
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-3 py-3">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map(l=>(
                  <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs font-medium text-gray-700">{vehicleLabel(l.vehicleId)}</td>
                    <td className="px-3 py-3 text-xs capitalize">{l.maintenanceType}</td>
                    <td className="px-3 py-3 max-w-xs"><p className="truncate text-sm">{l.jobDescription}</p></td>
                    <td className="px-3 py-3 text-xs text-gray-500">{l.datePerformed}</td>
                    <td className="px-3 py-3 text-xs">{l.technicianName||"—"}</td>
                    <td className="px-3 py-3 text-xs">₱{(l.laborCost||0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs">₱{(l.partsCost||0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs font-bold text-gray-800">₱{(l.totalCost||0).toLocaleString()}</td>
                    <td className="px-3 py-3"><StatusBadge status={l.status}/></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>openEdit(l)}
                          className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition">Edit</button>
                        {l.status!=="completed"&&(
                          <button onClick={()=>markComplete(l)}
                            className="text-xs px-2 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1">
                            <CheckCircle className="w-3 h-3"/> Done
                          </button>
                        )}
                        <button onClick={()=>setConfirm(l.id)} className="p-1.5 rounded-lg text-red-300 hover:bg-red-50 transition">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modal==="form"} onClose={()=>setModal(null)} title={editing?"Edit Job Order":"New Job Order / Maintenance Record"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Vehicle *" value={form.vehicleId} onChange={f("vehicleId")}>
            <option value="">Select vehicle…</option>
            {(vehicles||[]).map(v=><option key={v.id} value={v.id}>{v.plateNumber} — {v.brand} {v.model}</option>)}
          </Select>
          <Select label="Maintenance Type" value={form.maintenanceType} onChange={f("maintenanceType")}>
            {TYPES.map(t=><option key={t} value={t} className="capitalize">{t}</option>)}
          </Select>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Job Description *</label>
            <textarea rows={3} value={form.jobDescription} onChange={f("jobDescription")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 resize-none"
              placeholder="Describe the work performed…"/>
          </div>
          <Input label="Date Performed" type="date" value={form.datePerformed} onChange={f("datePerformed")}/>
          <Input label="Technician / Mechanic" value={form.technicianName} onChange={f("technicianName")} placeholder="Full name"/>
          <Input label="Labor Cost (₱)" type="number" value={form.laborCost} onChange={f("laborCost")}/>
          <Input label="Next Service at KM" type="number" value={form.nextServiceKM} onChange={f("nextServiceKM")} placeholder="e.g. 75000"/>
          <Select label="Status" value={form.status} onChange={f("status")}>
            {STATUSES.map(s=><option key={s} value={s} className="capitalize">{s.replace(/_/g," ")}</option>)}
          </Select>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
            <textarea rows={2} value={form.remarks} onChange={f("remarks")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 resize-none"
              placeholder="Parts list, notes…"/>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={()=>setModal(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving?"Saving…":editing?"Save Changes":"Create Job Order"}</Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Delete Job Order?" size="sm">
        <p className="text-sm text-gray-600">This will permanently delete this maintenance record.</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={()=>setConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={()=>handleDelete(confirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}