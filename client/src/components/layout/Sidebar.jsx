// src/components/layout/Sidebar.jsx

import { NavLink, useNavigate } from "react-router-dom";
import { signOut }              from "firebase/auth";
import { auth }                 from "../../utils/firebase";
import { useAuth }              from "../../context/AuthContext";
import {
  LayoutDashboard, Truck, Package, FileText,
  Wrench, Users, LogOut, ChevronRight, Bus, Calendar, X,
} from "lucide-react";
import toast from "react-hot-toast";

const NAV = [
  { label: "Dashboard",    path: "/dashboard",   icon: LayoutDashboard, roles: [] },
  { label: "Calendar",     path: "/calendar",    icon: Calendar,        roles: [] },
  { label: "Vehicles",     path: "/vehicles",    icon: Truck,           roles: [] },
  { label: "Inventory",    path: "/inventory",   icon: Package,         roles: ["admin", "motorpool", "driver"] },
  { label: "Trip Tickets", path: "/trips",       icon: FileText,        roles: [] },
  { label: "Maintenance",  path: "/maintenance", icon: Wrench,          roles: ["admin", "motorpool", "driver"] },
  { label: "Users",        path: "/users",       icon: Users,           roles: ["admin"] },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile, isMobile }) {
  const { userProfile } = useAuth();
  const navigate        = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out");
      navigate("/login");
    } catch {
      toast.error("Sign-out failed");
    }
  };

  const visibleNav = NAV.filter(
    (item) => item.roles.length === 0 || item.roles.includes(userProfile?.role)
  );

  const sidebarWidth = isMobile ? 288 : collapsed ? 64 : 240;
  const translateX   = isMobile && !mobileOpen ? -(sidebarWidth + 10) : 0;

  return (
    <>
      {/* Full-screen backdrop — covers EVERYTHING including the right gap */}
      {isMobile && mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position:        "fixed",
            inset:           0,
            backgroundColor: "rgba(0,0,0,0.55)",
            zIndex:          49,
            // Extend backdrop above safe area so status bar area is also dimmed
            top:             "-50px",
            paddingTop:      "50px",
          }}
        />
      )}

      <aside
        style={{
          width:      sidebarWidth,
          transform:  `translateX(${translateX}px)`,
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          position:   "fixed",
          // Start from absolute top (0), including behind status bar.
          // The header inside adds paddingTop via safe-area env var.
          top:        0,
          left:       0,
          bottom:     0,
          zIndex:     50,
          display:    "flex",
          flexDirection: "column",
          backgroundColor: "#7B1C1C",
          boxShadow:  "4px 0 24px rgba(0,0,0,0.35)",
          // Also extend below bottom safe area
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            // Push header content below the device status bar
            paddingTop:    "calc(env(safe-area-inset-top) + 16px)",
            paddingBottom: "16px",
            paddingLeft:   "16px",
            paddingRight:  "16px",
            borderBottom:  "1px solid rgba(255,255,255,0.15)",
            flexShrink:    0,
            display:       "flex",
            alignItems:    "center",
            gap:           "12px",
          }}
        >
          <NavLink
            to="/dashboard"
            onClick={isMobile ? onCloseMobile : undefined}
            style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0, textDecoration: "none" }}
          >
            <div style={{
              flexShrink:      0,
              width:           36,
              height:          36,
              backgroundColor: "#C9A227",
              borderRadius:    "10px",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
            }}>
              <Bus size={20} color="#5A1313" />
            </div>

            {(!collapsed || isMobile) && (
              <div style={{ overflow: "hidden", flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "14px", color: "#C9A227", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  BukSU Motorpool
                </p>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                  PPMU Fleet System
                </p>
              </div>
            )}
          </NavLink>

          {/* X close button — mobile only */}
          {isMobile && (
            <button
              onClick={onCloseMobile}
              style={{
                flexShrink:      0,
                padding:         "6px",
                borderRadius:    "8px",
                background:      "transparent",
                border:          "none",
                cursor:          "pointer",
                color:           "rgba(255,255,255,0.7)",
                display:         "flex",
                alignItems:      "center",
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {visibleNav.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={isMobile ? onCloseMobile : undefined}
              style={({ isActive }) => ({
                display:        "flex",
                alignItems:     "center",
                gap:            "12px",
                padding:        "12px 16px",
                margin:         "2px 8px",
                borderRadius:   "12px",
                textDecoration: "none",
                fontSize:       "14px",
                fontWeight:     500,
                transition:     "background 0.15s",
                backgroundColor: isActive ? "#C9A227" : "transparent",
                color:           isActive ? "#5A1313" : "rgba(255,255,255,0.8)",
              })}
            >
              <Icon size={20} style={{ flexShrink: 0 }} />
              {(!collapsed || isMobile) && (
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── User info + logout ──────────────────────────────────────────── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.15)",
          padding:   "12px",
          flexShrink: 0,
        }}>
          {(!collapsed || isMobile) && (
            <div style={{
              marginBottom:    "8px",
              padding:         "10px 12px",
              borderRadius:    "12px",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userProfile?.name || "User"}
              </p>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", margin: 0, textTransform: "capitalize" }}>
                {userProfile?.role} · {userProfile?.officeDepartment || "PPMU"}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display:         "flex",
              alignItems:      "center",
              gap:             "8px",
              width:           "100%",
              padding:         "10px 12px",
              borderRadius:    "12px",
              border:          "none",
              background:      "transparent",
              color:           "rgba(255,255,255,0.6)",
              fontSize:        "14px",
              cursor:          "pointer",
              textAlign:       "left",
            }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {(!collapsed || isMobile) && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={onToggle}
            style={{
              position:        "absolute",
              right:           -12,
              top:             80,
              width:           24,
              height:          24,
              borderRadius:    "50%",
              backgroundColor: "#7B1C1C",
              border:          "1px solid rgba(255,255,255,0.2)",
              color:           "white",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              cursor:          "pointer",
              boxShadow:       "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            <ChevronRight
              size={14}
              style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
            />
          </button>
        )}
      </aside>
    </>
  );
}