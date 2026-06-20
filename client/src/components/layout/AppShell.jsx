// src/components/layout/AppShell.jsx
// Main layout: sidebar + top bar + content area.
//
// On native mobile (Capacitor): sidebar is always an off-canvas drawer,
// opened via the hamburger button — no persistent sidebar, no md: breakpoints.
// On desktop browser: sidebar is always visible and collapsible.

import { useState, useEffect } from "react";
import { Outlet, Link }        from "react-router-dom";
import Sidebar                  from "./Sidebar";
import { useAuth }              from "../../context/AuthContext";
import { Bell, Menu }           from "lucide-react";

function isNativeMobile() {
  return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
}

export default function AppShell() {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    // Native Capacitor app always uses mobile drawer layout.
    // On web, use window width to decide (matches the old md: breakpoint).
    const checkMobile = () => {
      setIsMobile(isNativeMobile() || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        isMobile={isMobile}
      />

      {/* Main content */}
      <div
        className="flex flex-col flex-1 min-w-0 transition-all duration-200"
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 64 : 240,
        }}
      >
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger — always shown on mobile, hidden on desktop */}
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 truncate hidden sm:block">
                Bukidnon State University
              </p>
              <p className="text-xs font-semibold text-gray-700 truncate">
                {isMobile ? "Motorpool" : "Physical Plant & Maintenance Unit — Motorpool Section"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            {!isMobile && (
              <Link to="/profile" className="text-right hover:opacity-80 transition hidden sm:block">
                <p className="text-sm font-medium text-gray-700">{userProfile?.name || "User"}</p>
                <p className="text-xs text-gray-400 capitalize">{userProfile?.role}</p>
              </Link>
            )}
            <Link
              to="/profile"
              className="w-8 h-8 rounded-full bg-buksu-maroon text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden hover:opacity-80 transition"
            >
              {userProfile?.photoURL
                ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
                : (userProfile?.name || "U")[0].toUpperCase()}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}