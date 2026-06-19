// src/components/layout/AppShell.jsx
// Main layout: sidebar + top bar + content area.
//
// Responsive behavior:
//   - Desktop (md+): sidebar is fixed and pushes content via margin-left.
//     Collapse toggle shrinks it to icon-only width.
//   - Mobile (below md): sidebar becomes an off-canvas drawer with zero
//     content margin; a hamburger button in the top bar opens it over a
//     backdrop instead of squeezing the page.

import { useState } from "react";
import { Outlet, Link }   from "react-router-dom";
import Sidebar       from "./Sidebar";
import { useAuth }   from "../../context/AuthContext";
import { Bell, Menu } from "lucide-react";

export default function AppShell() {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const { userProfile } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main content — no left margin on mobile (sidebar is off-canvas),
          responds to collapsed state on desktop */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${collapsed ? "md:ml-16" : "md:ml-60"}`}
      >
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 md:hidden flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 truncate hidden sm:block">Bukidnon State University</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 truncate">
                <span className="hidden sm:inline">Physical Plant & Maintenance Unit — </span>Motorpool Section
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Bell className="w-5 h-5" />
              {/* Notification dot — wire up to real data when needed */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <Link to="/profile" className="text-right hidden sm:block hover:opacity-80 transition">
              <p className="text-sm font-medium text-gray-700">{userProfile?.name || "User"}</p>
              <p className="text-xs text-gray-400 capitalize">{userProfile?.role}</p>
            </Link>
            <Link to="/profile" className="w-8 h-8 rounded-full bg-buksu-maroon text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden hover:opacity-80 transition">
              {userProfile?.photoURL
                ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
                : (userProfile?.name || "U")[0].toUpperCase()}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}