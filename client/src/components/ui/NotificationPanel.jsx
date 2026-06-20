// src/components/ui/NotificationPanel.jsx
// Dropdown notification panel — slides down from the bell icon.

import { useNavigate } from "react-router-dom";
import {
  Bell, X, FileText, Package, Wrench,
  CheckCircle, XCircle, Truck, AlertTriangle, Clock,
} from "lucide-react";

const TYPE_CONFIG = {
  pending_trip:    { icon: Clock,         color: "#f59e0b", bg: "#fef3c7" },
  low_stock:       { icon: Package,       color: "#ef4444", bg: "#fee2e2" },
  maintenance:     { icon: Wrench,        color: "#3b82f6", bg: "#dbeafe" },
  driver_declined: { icon: XCircle,       color: "#ef4444", bg: "#fee2e2" },
  assigned_trip:   { icon: Truck,         color: "#7B1C1C", bg: "#fce7e7" },
  trip_approved:   { icon: CheckCircle,   color: "#10b981", bg: "#d1fae5" },
  trip_rejected:   { icon: XCircle,       color: "#ef4444", bg: "#fee2e2" },
  trip_completed:  { icon: CheckCircle,   color: "#6366f1", bg: "#ede9fe" },
};

function timeAgo(date) {
  if (!date) return "";
  const d   = date instanceof Date ? date : new Date(date);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60)   return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function NotificationPanel({ notifications, loading, error, onClose, safeAreaTop = 0 }) {
  const navigate = useNavigate();

  const handleClick = (link) => {
    onClose();
    navigate(link);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          998,
          backgroundColor: "transparent",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position:        "fixed",
          top:             safeAreaTop + 56 + 4,
          right:           12,
          width:           Math.min(360, window.innerWidth - 24),
          maxHeight:       "70vh",
          backgroundColor: "white",
          borderRadius:    "16px",
          boxShadow:       "0 10px 40px rgba(0,0,0,0.18)",
          zIndex:          999,
          display:         "flex",
          flexDirection:   "column",
          overflow:        "hidden",
          border:          "1px solid #e5e7eb",
        }}
      >
        {/* Header */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "16px 16px 12px",
          borderBottom:   "1px solid #f3f4f6",
          flexShrink:     0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={18} color="#7B1C1C" />
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#111827" }}>
              Notifications
            </span>
            {notifications.length > 0 && (
              <span style={{
                backgroundColor: "#7B1C1C",
                color:           "white",
                borderRadius:    "20px",
                padding:         "1px 8px",
                fontSize:        "11px",
                fontWeight:      600,
              }}>
                {notifications.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "6px" }}
          >
            <X size={18} color="#6b7280" />
          </button>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
              Loading…
            </div>
          ) : error ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <AlertTriangle size={28} color="#ef4444" style={{ margin: "0 auto 8px" }} />
              <p style={{ color: "#ef4444", fontSize: "13px", fontWeight: 600, margin: "0 0 4px" }}>
                Could not load notifications
              </p>
              <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <Bell size={32} color="#d1d5db" style={{ margin: "0 auto 8px" }} />
              <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>No notifications</p>
            </div>
          ) : (
            notifications.map((n, i) => {
              const cfg     = TYPE_CONFIG[n.type] || TYPE_CONFIG.pending_trip;
              const Icon    = cfg.icon;
              const isLast  = i === notifications.length - 1;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n.link)}
                  style={{
                    display:         "flex",
                    alignItems:      "flex-start",
                    gap:             "12px",
                    width:           "100%",
                    padding:         "14px 16px",
                    borderBottom:    isLast ? "none" : "1px solid #f9fafb",
                    border:          "none",
                    background:      "transparent",
                    cursor:          "pointer",
                    textAlign:       "left",
                    transition:      "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <div style={{
                    flexShrink:      0,
                    width:           36,
                    height:          36,
                    borderRadius:    "10px",
                    backgroundColor: cfg.bg,
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "center",
                  }}>
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin:       0,
                      fontSize:     "13px",
                      fontWeight:   600,
                      color:        "#111827",
                      marginBottom: "2px",
                    }}>
                      {n.title}
                    </p>
                    <p style={{
                      margin:     0,
                      fontSize:   "12px",
                      color:      "#6b7280",
                      overflow:   "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {n.message}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9ca3af" }}>
                      {timeAgo(n.time)}
                    </p>
                  </div>
                  {n.priority === "high" && (
                    <div style={{
                      flexShrink:      0,
                      width:           7,
                      height:          7,
                      borderRadius:    "50%",
                      backgroundColor: "#ef4444",
                      marginTop:       "6px",
                    }} />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}