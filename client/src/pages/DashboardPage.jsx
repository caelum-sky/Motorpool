// src/pages/DashboardPage.jsx
import { useVehicles, useInventory, useTripTickets, useMaintenance } from "../hooks/useApi";
import { StatCard, Card, StatusBadge, Spinner } from "../components/ui";
import { Truck, Package, FileText, Wrench, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const { data: vehicles,    loading: vL } = useVehicles();
  const { data: inventory,   loading: iL } = useInventory();
  const { data: trips,       loading: tL } = useTripTickets(userProfile);
  const { data: maintenance, loading: mL } = useMaintenance();

  const v        = vehicles    || [];
  const inv      = inventory   || [];
  const tri      = trips       || [];
  const maint    = maintenance || [];
  const lowStock = inv.filter(p => p.stockQty <= p.reorderLevel);
  const pending  = tri.filter(t => t.status === "pending");
  const openJOR  = maint.filter(m => m.status !== "completed");
  const loading  = vL || iL || tL || mL;

  const today = new Date().toLocaleDateString("en-PH", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{today}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Fleet"    value={v.length}         icon={Truck}         color="maroon" sub={`${v.filter(x=>x.conditionStatus==="available").length} available`} />
            <StatCard label="Pending Trips"  value={pending.length}   icon={Clock}         color="orange" sub="awaiting approval" />
            <StatCard label="Low Stock Items"value={lowStock.length}  icon={AlertTriangle} color={lowStock.length>0?"red":"green"} sub={lowStock.length>0?"reorder needed":"stock OK"} />
            <StatCard label="Open Job Orders"value={openJOR.length}   icon={Wrench}        color="blue"   sub="in progress" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {label:"Available",     count:v.filter(x=>x.conditionStatus==="available").length,     cls:"text-emerald-600 bg-emerald-50", icon:CheckCircle},
              {label:"Dispatched",    count:v.filter(x=>x.conditionStatus==="dispatched").length,    cls:"text-blue-600 bg-blue-50",       icon:Truck},
              {label:"Maintenance",   count:v.filter(x=>x.conditionStatus==="maintenance").length,   cls:"text-yellow-600 bg-yellow-50",   icon:Wrench},
              {label:"Unserviceable", count:v.filter(x=>x.conditionStatus==="unserviceable").length, cls:"text-red-600 bg-red-50",         icon:XCircle},
            ].map(({label,count,cls,icon:Icon})=>(
              <div key={label} className={`rounded-xl p-4 flex items-center gap-3 ${cls}`}>
                <Icon className="w-5 h-5 flex-shrink-0"/>
                <div><p className="text-xl font-bold">{count}</p><p className="text-xs font-medium">{label}</p></div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-buksu-maroon"/> Pending Trip Requests
              </h2>
              {pending.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No pending requests.</p>
              ) : pending.slice(0,6).map(t=>(
                <div key={t.id} className="flex items-start justify-between p-3 rounded-lg bg-gray-50 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.destination}</p>
                    <p className="text-xs text-gray-500">{t.requestorName} · {t.dateTravel}</p>
                  </div>
                  <StatusBadge status={t.status}/>
                </div>
              ))}
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-red-500"/> Low Stock Alerts
              </h2>
              {lowStock.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-emerald-600">
                  <CheckCircle className="w-8 h-8 mb-2"/>
                  <p className="text-sm font-medium">All parts well-stocked.</p>
                </div>
              ) : lowStock.slice(0,6).map(p=>(
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.itemName}</p>
                    <p className="text-xs text-gray-500 capitalize">{p.category?.replace(/_/g," ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{p.stockQty} {p.unit}</p>
                    <p className="text-xs text-gray-400">Min: {p.reorderLevel}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-buksu-maroon"/> Recent Job Orders
            </h2>
            {maint.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No maintenance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200">
                    {["Type","Description","Date","Technician","Cost","Status"].map(h=>(
                      <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500 pr-4">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {maint.slice(0,5).map(l=>(
                      <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-4 capitalize text-xs">{l.maintenanceType}</td>
                        <td className="py-2 pr-4 max-w-xs truncate">{l.jobDescription}</td>
                        <td className="py-2 pr-4 text-xs text-gray-500">{l.datePerformed}</td>
                        <td className="py-2 pr-4 text-xs">{l.technicianName}</td>
                        <td className="py-2 pr-4 text-xs font-medium">₱{(l.totalCost||0).toLocaleString()}</td>
                        <td className="py-2"><StatusBadge status={l.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}