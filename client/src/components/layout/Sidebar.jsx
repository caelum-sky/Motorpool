// src/components/layout/Sidebar.jsx
// Responsive sidebar.
//
// isMobile=true  → off-canvas drawer. Hidden by default, slides in when
//                   mobileOpen=true. Controlled by hamburger in AppShell.
// isMobile=false → fixed visible sidebar, collapsible to icon-only width.

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

  // ── Sidebar width / translate based on mode ─────────────────────────────
  const sidebarWidth = isMobile ? 288 : collapsed ? 64 : 240; // px

  // On mobile: slides off-canvas to the left when closed.
  // On desktop: always visible; only width changes on collapse.
  const translateX = isMobile && !mobileOpen ? -sidebarWidth : 0;

  return (
    <>
      {/* Backdrop — mobile only, tapping closes the drawer */}
      {isMobile && mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40"
          style={{ touchAction: "none" }}
        />
      )}

      <aside
        style={{
          width:     sidebarWidth,
          transform: `translateX(${translateX}px)`,
          transition: "transform 0.22s ease, width 0.22s ease",
          position:  "fixed",
          top:       0,
          left:      0,
          height:    "100%",
          zIndex:    50,
        }}
        className="flex flex-col bg-buksu-maroon text-white shadow-xl"
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-5 border-b flex-shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          <NavLink
            to="/dashboard"
            onClick={isMobile ? onCloseMobile : undefined}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="flex-shrink-0 w-9 h-9 bg-buksu-gold rounded-lg flex items-center justify-center">
              <Bus className="w-5 h-5 text-buksu-maroon-dark" />
            </div>

            {/* Hide text when desktop-collapsed */}
            {(!collapsed || isMobile) && (
              <div className="leading-tight overflow-hidden flex-1">
                <p className="font-bold text-sm text-buksu-gold truncate">BukSU Motorpool</p>
                <p className="text-[10px] text-white/60 truncate">PPMU Fleet System</p>
              </div>
            )}
          </NavLink>

          {/* X close button — mobile only */}
          {isMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleNav.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={isMobile ? onCloseMobile : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-xl mb-0.5 transition-all text-sm font-medium
                ${isActive
                  ? "bg-buksu-gold text-buksu-maroon-dark shadow"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {/* Hide label when desktop-collapsed */}
              {(!collapsed || isMobile) && (
                <span className="truncate">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div
          className="border-t p-3 flex-shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          {(!collapsed || isMobile) && (
            <div className="mb-2 px-2 py-2 rounded-xl bg-white/10">
              <p className="text-xs font-semibold text-white truncate">
                {userProfile?.name || "User"}
              </p>
              <p className="text-[10px] text-white/50 capitalize truncate">
                {userProfile?.role} · {userProfile?.officeDepartment || "PPMU"}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-white/70 hover:bg-red-700/60 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {(!collapsed || isMobile) && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={onToggle}
            style={{ right: -12, top: 76 }}
            className="absolute bg-buksu-maroon border border-white/20 rounded-full p-1 text-white hover:bg-white/20 transition-colors shadow"
          >
            <ChevronRight
              className="w-3.5 h-3.5 transition-transform"
              style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
            />
          </button>
        )}
      </aside>
    </>
  );
}