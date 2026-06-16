// src/components/layout/AppShell.jsx
// Main layout: sidebar + top bar + content area.

import { useState } from "react";
import { Outlet }   from "react-router-dom";
import Sidebar       from "./Sidebar";
import { useAuth }   from "../../context/AuthContext";
import { Bell, Menu } from "lucide-react";

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { userProfile } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/* Main content */}
      <div
        className={`flex flex-col flex-1 transition-all duration-200 ${collapsed ? "ml-16" : "ml-60"}`}
      >
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs text-gray-400">Bukidnon State University</p>
              <p className="text-sm font-semibold text-gray-700">
                Physical Plant & Maintenance Unit — Motorpool Section
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Bell className="w-5 h-5" />
              {/* Notification dot — wire up to real data when needed */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-700">{userProfile?.name || "User"}</p>
              <p className="text-xs text-gray-400 capitalize">{userProfile?.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-buksu-maroon text-white flex items-center justify-center text-sm font-bold">
              {(userProfile?.name || "U")[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
