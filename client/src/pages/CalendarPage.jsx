// src/pages/CalendarPage.jsx
// Shared schedule view — every role sees the trips relevant to them
// (staff: their own requests, driver: their assigned trips, admin/motorpool:
// everything) laid out on a clean month grid, with day/week views available
// as a toggle for closer inspection.

import { useState, useMemo } from "react";
import { useTripTickets }    from "../hooks/useApi";
import { useAuth }           from "../context/AuthContext";
import { Card, StatusBadge, Spinner, EmptyState } from "../components/ui";
import { ChevronUp, ChevronDown, Calendar as CalendarIcon, Truck, Clock } from "lucide-react";

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function addMonths(date, n) { return new Date(date.getFullYear(), date.getMonth() + n, 1); }
function isoDate(date) { return date.toISOString().split("T")[0]; }
function isSameDay(a, b) { return isoDate(a) === isoDate(b); }

const STATUS_DOT = {
  pending:   "bg-yellow-400",
  approved:  "bg-blue-500",
  ongoing:   "bg-purple-500",
  completed: "bg-emerald-500",
  rejected:  "bg-red-400",
};

export default function CalendarPage() {
  const { userProfile } = useAuth();
  const { data: trips, loading } = useTripTickets(userProfile);

  const [anchor, setAnchor]       = useState(new Date());
  const [selected, setSelected]   = useState(new Date());

  const tripsByDate = useMemo(() => {
    const map = {};
    for (const t of trips || []) {
      if (!t.dateTravel) continue;
      (map[t.dateTravel] ||= []).push(t);
    }
    return map;
  }, [trips]);

  const monthStart  = startOfMonth(anchor);
  const gridStart    = startOfWeek(monthStart);
  const cells         = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const currentMonth = anchor.getMonth();
  const today          = new Date();

  const selectedIso = isoDate(selected);
  const selectedTrips = tripsByDate[selectedIso] || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Schedule Calendar</h1>
        <p className="text-sm text-gray-500">
          {userProfile?.role === "staff" ? "Your trip requests" :
           userProfile?.role === "driver" ? "Your assigned trips" :
           "All scheduled trips"}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* ── Calendar card (matches the reference layout) ──────────────── */}
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {selected.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-900 text-white">
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-semibold">
                  {monthStart.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
                </p>
                <div className="flex flex-col">
                  <button onClick={() => setAnchor(addMonths(anchor, -1))} className="p-0.5 text-gray-400 hover:text-white transition">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => setAnchor(addMonths(anchor, 1))} className="p-0.5 text-gray-400 hover:text-white transition">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <p key={d} className="text-xs font-medium text-gray-400 text-center">{d}</p>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {cells.map(d => {
                  const iso = isoDate(d);
                  const dayTrips = tripsByDate[iso] || [];
                  const inMonth = d.getMonth() === currentMonth;
                  const isToday = isSameDay(d, today);
                  const isSelected = isSameDay(d, selected);

                  return (
                    <button
                      key={iso}
                      onClick={() => setSelected(d)}
                      className="flex flex-col items-center py-1.5 group"
                    >
                      <span className={`
                        w-8 h-8 flex items-center justify-center rounded-full text-sm transition
                        ${isSelected ? "bg-blue-500 text-white font-semibold" :
                          isToday ? "bg-gray-700 text-white" :
                          inMonth ? "text-gray-100 group-hover:bg-gray-800" : "text-gray-600 group-hover:bg-gray-800"}
                      `}>
                        {d.getDate()}
                      </span>
                      <span className="h-1.5 flex items-center gap-0.5 mt-0.5">
                        {dayTrips.slice(0, 3).map((t, i) => (
                          <span key={i} className={`w-1 h-1 rounded-full ${STATUS_DOT[t.status] || "bg-gray-400"}`} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* ── Selected day's trips ────────────────────────────────────────── */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">
              {selected.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {selectedTrips.length} trip{selectedTrips.length !== 1 ? "s" : ""} scheduled
            </p>

            {selectedTrips.length === 0 ? (
              <EmptyState icon={CalendarIcon} title="No trips" description="Nothing scheduled for this day." />
            ) : (
              <div className="space-y-2">
                {selectedTrips.map(t => (
                  <div key={t.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.destination}</p>
                        <p className="text-xs text-gray-500 truncate">{t.requestorName}</p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {t.timeDepart || "—"}–{t.timeReturn || "—"}
                    </div>
                    {t.assignments?.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                        <Truck className="w-3 h-3" />
                        {t.assignments.map(a => a.plateNumber).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}