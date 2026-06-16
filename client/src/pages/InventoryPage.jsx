// src/pages/InventoryPage.jsx — Full CRUD + Issue Part
import { useState } from "react";
import { useInventory, useVehicles } from "../hooks/useApi";
import { inventoryApi } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Modal, Input, Select, EmptyState, Spinner } from "../components/ui";
import { Package, Plus, Search, RefreshCw, AlertTriangle, Minus, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["spare_parts","lubricants","tires","batteries","filters","electrical","other"];
const UNITS      = ["piece","liter","set","pair","can","box","meter","kg"];
const EMPTY_FORM = { itemName:"", category:"spare_parts", stockQty:0, reorderLevel:5, unitCost:0, unit:"piece", shelfLocation:"", supplier:"" };
const EMPTY_ISSUE = { vehicleId:"", qtyIssued:1, technicianName:"", remarks:"" };

export default function InventoryPage() {
  const { userProfile }                        = useAuth();
  const { data: parts, loading, refetch }      = useInventory();
  const { data: vehicles }                     = useVehicles();
  const [search,    setSearch]                 = useState("");
  const [catFilter, setCatFilter]              = useState("");
  const [showLow,   setShowLow]                = useState(false);
  const [modal,     setModal]                  = useState(null);
  const [editing,   setEditing]                = useState(null);
  const [issuing,   setIssuing]                = useState(null);
  const [confirm,   setConfirm]                = useState(null);
  const [form,      setForm]                   = useState(EMPTY_FORM);
  const [issueForm, setIssueForm]              = useState(EMPTY_ISSUE);
  const [saving,    setSaving]                 = useState(false);

  const filtered = (parts||[]).filter(p => {
    const m = !search || [p.itemName,p.category,p.shelfLocation,p.supplier].some(f=>f?.toLowerCase().includes(search.toLowerCase()));
    return m && (!catFilter||p.category===catFilter) && (!showLow||p.stockQty<=p.reorderLevel);
  });

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal("form"); };
  const openEdit = (p) => { setForm({ itemName:p.itemName, category:p.category, stockQty:p.stockQty, reorderLevel:p.reorderLevel, unitCost:p.unitCost, unit:p.unit||"piece", shelfLocation:p.shelfLocation||"", supplier:p.supplier||"" }); setEditing(p); setModal("form"); };
  const openIssue = (p) => { setIssuing(p); setIssueForm(EMPTY_ISSUE); setModal("issue"); };
  const f  = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const fi = k => e => setIssueForm(p=>({...p,[k]:e.target.value}));

  const handleSave = async () => {
    if (!form.itemName||!form.category) return toast.error("Item name and category required.");
    setSaving(true);
    try {
      const payload = { ...form, stockQty:Number(form.stockQty), reorderLevel:Number(form.reorderLevel), unitCost:parseFloat(form.unitCost) };
      if (editing) { await inventoryApi.update(editing.id, payload); toast.success("Part updated."); }
      else         { await inventoryApi.create(payload);              toast.success("Part added."); }
      setModal(null); refetch();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await inventoryApi.delete(id); toast.success("Part deleted."); setConfirm(null); refetch(); }
    catch(err) { toast.error(err.message); }
  };

  const handleIssue = async () => {
    if (!issueForm.vehicleId||!issueForm.qtyIssued) return toast.error("Vehicle and quantity required.");
    setSaving(true);
    try {
      await inventoryApi.issuePart({ partId:issuing.id, vehicleId:issueForm.vehicleId, qtyIssued:Number(issueForm.qtyIssued), technicianName:issueForm.technicianName, remarks:issueForm.remarks, issuedByUid:userProfile?.uid, issuedByName:userProfile?.name||userProfile?.email });
      toast.success(`Issued ${issueForm.qtyIssued} ${issuing.unit||"pc(s)"} of ${issuing.itemName}`);
      setModal(null); refetch();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const lowCount = (parts||[]).filter(p=>p.stockQty<=p.reorderLevel).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Parts & Supplies Inventory</h1>
          <p className="text-sm text-gray-500">{(parts||[]).length} items · {lowCount} low stock</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><RefreshCw className="w-4 h-4"/></button>
          <Button onClick={openAdd} variant="primary"><Plus className="w-4 h-4"/> Add Part</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="text" placeholder="Search parts, location…" value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40"/>
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40">
          <option value="">All categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
        </select>
        <button onClick={()=>setShowLow(!showLow)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${showLow?"bg-red-50 border-red-300 text-red-700 font-medium":"border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
          <AlertTriangle className="w-4 h-4"/> Low Stock {lowCount>0&&`(${lowCount})`}
        </button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg"/></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="No parts found" description="Add parts to your inventory."/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["Item Name","Category","Stock","Reorder At","Unit Cost","Location","Supplier","Actions"].map(h=>(
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map(p=>{
                  const isLow = p.stockQty<=p.reorderLevel;
                  return (
                    <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isLow?"bg-red-50/40":""}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {isLow&&<AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0"/>}
                          {p.itemName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 capitalize">{p.category?.replace(/_/g," ")}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-sm ${isLow?"text-red-600":"text-gray-900"}`}>{p.stockQty}</span>
                        <span className="text-xs text-gray-400 ml-1">{p.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.reorderLevel} {p.unit}</td>
                      <td className="px-4 py-3 text-xs">₱{(p.unitCost||0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.shelfLocation||"—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{p.supplier||"—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={()=>openIssue(p)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-buksu-maroon text-white hover:bg-buksu-maroon-dark transition">
                            <Minus className="w-3 h-3"/> Issue
                          </button>
                          <button onClick={()=>openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                            <Edit className="w-3.5 h-3.5"/>
                          </button>
                          <button onClick={()=>setConfirm(p.id)} className="p-1.5 rounded-lg text-red-300 hover:bg-red-50 transition">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modal==="form"} onClose={()=>setModal(null)} title={editing?`Edit: ${editing.itemName}`:"Add New Part / Supply"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Item Name *" value={form.itemName} onChange={f("itemName")} placeholder="Engine Oil Filter" className="col-span-2"/>
          <Select label="Category *" value={form.category} onChange={f("category")}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
          </Select>
          <Select label="Unit" value={form.unit} onChange={f("unit")}>
            {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
          </Select>
          <Input label="Stock Quantity" type="number" value={form.stockQty} onChange={f("stockQty")}/>
          <Input label="Reorder Level" type="number" value={form.reorderLevel} onChange={f("reorderLevel")}/>
          <Input label="Unit Cost (₱)" type="number" step="0.01" value={form.unitCost} onChange={f("unitCost")}/>
          <Input label="Shelf Location" value={form.shelfLocation} onChange={f("shelfLocation")} placeholder="Shelf A-3"/>
          <Input label="Supplier" value={form.supplier} onChange={f("supplier")} placeholder="Supplier name" className="col-span-2"/>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={()=>setModal(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving?"Saving…":editing?"Save Changes":"Add Part"}</Button>
        </div>
      </Modal>

      {/* Issue Part Modal */}
      <Modal open={modal==="issue"} onClose={()=>setModal(null)} title={`Issue Part: ${issuing?.itemName||""}`} size="md">
        {issuing&&(
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
              <div><p className="text-xs text-gray-400">In Stock</p><p className="font-bold text-gray-900">{issuing.stockQty} {issuing.unit}</p></div>
              <div><p className="text-xs text-gray-400">Unit Cost</p><p className="font-bold text-gray-900">₱{(issuing.unitCost||0).toLocaleString()}</p></div>
            </div>
            <Select label="Assign to Vehicle *" value={issueForm.vehicleId} onChange={fi("vehicleId")}>
              <option value="">Select vehicle…</option>
              {(vehicles||[]).map(v=><option key={v.id} value={v.id}>{v.plateNumber} — {v.brand} {v.model}</option>)}
            </Select>
            <Input label={`Quantity to Issue * (max ${issuing.stockQty})`} type="number" min={1} max={issuing.stockQty} value={issueForm.qtyIssued} onChange={fi("qtyIssued")}/>
            <Input label="Technician Name" value={issueForm.technicianName} onChange={fi("technicianName")} placeholder="Mechanic's name"/>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <textarea rows={2} value={issueForm.remarks} onChange={fi("remarks")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 resize-none"
                placeholder="Job order ref, notes…"/>
            </div>
            {issueForm.qtyIssued>0&&(
              <div className="bg-buksu-maroon/5 rounded-lg p-3 border border-buksu-maroon/20">
                <p className="text-xs text-gray-500">Estimated Total Cost</p>
                <p className="text-xl font-bold text-buksu-maroon">₱{(Number(issueForm.qtyIssued)*(issuing.unitCost||0)).toLocaleString()}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={()=>setModal(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleIssue} disabled={saving}>{saving?"Processing…":"Confirm Issuance"}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Delete Part?" size="sm">
        <p className="text-sm text-gray-600">This will permanently remove this inventory item. This cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={()=>setConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={()=>handleDelete(confirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}