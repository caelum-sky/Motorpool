// src/components/layout/AppShell.jsx

import { useState, useEffect } from "react";
import { Outlet, Link }        from "react-router-dom";
import Sidebar                  from "./Sidebar";
import NotificationPanel        from "../ui/NotificationPanel";
import { useAuth }              from "../../context/AuthContext";
import { useNotifications }     from "../../hooks/useNotifications";
import { Bell, Menu }           from "lucide-react";

function isNativeMobile() {
  return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
}

export default function AppShell() {
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);
  const [safeAreaTop,  setSafeAreaTop]  = useState(0);
  const [showNotifs,   setShowNotifs]   = useState(false);

  const { user, userProfile } = useAuth();
  const { notifications, loading: notifsLoading, error: notifsError, refetch: refetchNotifs } =
    useNotifications(user, userProfile);

  // Count only high-priority unread for the badge
  const unreadCount = notifications.filter(n => n.priority === "high").length;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isNativeMobile() || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;top:env(safe-area-inset-top,0px);height:1px;pointer-events:none;opacity:0;";
    document.body.appendChild(el);
    const val = parseFloat(getComputedStyle(el).top) || 0;
    document.body.removeChild(el);
    setSafeAreaTop(val);
  }, []);

  const sidebarWidth = isMobile ? 0 : collapsed ? 64 : 240;
  const headerHeight = 56 + safeAreaTop;

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f9fafb", overflow: "hidden" }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        isMobile={isMobile}
      />

      <div style={{
        display:       "flex",
        flexDirection: "column",
        flex:          1,
        minWidth:      0,
        marginLeft:    sidebarWidth,
        transition:    "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header style={{
          height:          headerHeight,
          backgroundColor: "white",
          borderBottom:    "1px solid #e5e7eb",
          display:         "flex",
          alignItems:      "flex-end",
          justifyContent:  "space-between",
          paddingLeft:     "12px",
          paddingRight:    "12px",
          paddingBottom:   "8px",
          paddingTop:      safeAreaTop,
          boxShadow:       "0 1px 3px rgba(0,0,0,0.08)",
          flexShrink:      0,
          zIndex:          30,
          position:        "relative",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                style={{
                  padding: "8px", borderRadius: "8px", border: "none",
                  background: "transparent", cursor: "pointer",
                  color: "#6b7280", display: "flex", alignItems: "center", flexShrink: 0,
                }}
              >
                <Menu size={22} />
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              {!isMobile && (
                <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>
                  Bukidnon State University
                </p>
              )}
              <p style={{
                fontSize: isMobile ? "14px" : "13px", fontWeight: 600,
                color: "#374151", margin: 0, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {isMobile ? "BukSU Motorpool" : "Physical Plant & Maintenance Unit — Motorpool Section"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>

            {/* ── Notification bell ─────────────────────────────────────── */}
            <button
              onClick={() => { setShowNotifs(v => !v); if (!showNotifs) refetchNotifs(); }}
              style={{
                position: "relative", padding: "8px", borderRadius: "8px",
                border: "none", background: showNotifs ? "#f3f4f6" : "transparent",
                cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center",
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position:        "absolute",
                  top:             "4px",
                  right:           "4px",
                  minWidth:        unreadCount > 9 ? "16px" : "14px",
                  height:          "14px",
                  backgroundColor: "#ef4444",
                  color:           "white",
                  borderRadius:    "10px",
                  fontSize:        "9px",
                  fontWeight:      700,
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  padding:         "0 3px",
                  lineHeight:      1,
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {!isMobile && (
              <Link to="/profile" style={{ textAlign: "right", textDecoration: "none" }}>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151", margin: 0 }}>
                  {userProfile?.name || "User"}
                </p>
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0, textTransform: "capitalize" }}>
                  {userProfile?.role}
                </p>
              </Link>
            )}

            <Link
              to="/profile"
              style={{
                width: "34px", height: "34px", borderRadius: "50%",
                backgroundColor: "#7B1C1C", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: 700, flexShrink: 0,
                overflow: "hidden", textDecoration: "none",
              }}
            >
              {userProfile?.photoURL
                ? <img src={userProfile.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (userProfile?.name || "U")[0].toUpperCase()}
            </Link>
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px" : "20px" }}>
          <Outlet />
        </main>
      </div>

      {/* ── Notification panel (portal-style fixed overlay) ─────────────── */}
      {showNotifs && (
        <NotificationPanel
          notifications={notifications}
          loading={notifsLoading}
          error={notifsError}
          onClose={() => setShowNotifs(false)}
          safeAreaTop={safeAreaTop}
        />
      )}
    </div>
  );
}