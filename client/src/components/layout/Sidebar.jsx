// src/components/layout/Sidebar.jsx
// Responsive sidebar with role-aware nav links and BukSU branding.
//
// Desktop (md and up): fixed, collapsible between full-width and icon-only.
// Mobile (below md): off-canvas drawer that slides in from the left over a
// backdrop, controlled by `mobileOpen`/`onCloseMobile` from AppShell.

import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Truck, Package, FileText,
  Wrench, Users, LogOut, ChevronRight, Bus, Calendar, X,
} from "lucide-react";
import toast from "react-hot-toast";

// Nav items: label, path, icon, allowed roles (empty = all roles)
const NAV = [
  { label: "Dashboard",    path: "/dashboard",   icon: LayoutDashboard, roles: [] },
  { label: "Calendar",     path: "/calendar",    icon: Calendar,        roles: [] },
  { label: "Vehicles",     path: "/vehicles",    icon: Truck,           roles: [] },
  { label: "Inventory",    path: "/inventory",   icon: Package,         roles: ["admin", "motorpool", "driver"] },
  { label: "Trip Tickets", path: "/trips",       icon: FileText,        roles: [] },
  { label: "Maintenance",  path: "/maintenance", icon: Wrench,          roles: ["admin", "motorpool", "driver"] },
  { label: "Users",        path: "/users",       icon: Users,           roles: ["admin"] },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

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

  return (
    <>
      {/* Mobile backdrop — tapping it closes the drawer */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      <aside
        className={`
          flex flex-col h-screen bg-buksu-maroon text-white shadow-xl z-50
          fixed top-0 left-0 transition-all duration-200

          /* Mobile: off-canvas drawer, fixed comfortable width, slides in/out */
          w-72 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}

          /* Desktop: always visible, width responds to collapsed state */
          md:translate-x-0 ${collapsed ? "md:w-16" : "md:w-60"}
        `}
      >
        {/* Logo / Header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-buksu-maroon-light">
          <div className="flex-shrink-0 w-9 h-9 bg-buksu-gold rounded-lg flex items-center justify-center">
            <Bus className="w-5 h-5 text-buksu-maroon-dark" />
          </div>
          <div className={`leading-tight overflow-hidden flex-1 ${collapsed ? "md:hidden" : ""}`}>
            <p className="font-bold text-sm text-buksu-gold truncate">BukSU Motorpool</p>
            <p className="text-[10px] text-white/60 truncate">PPMU Fleet System</p>
          </div>
          {/* Close button — mobile only */}
          <button onClick={onCloseMobile} className="md:hidden p-1 rounded-lg hover:bg-white/10 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNav.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all text-sm font-medium
                ${isActive
                  ? "bg-buksu-gold text-buksu-maroon-dark shadow"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info + Logout */}
        <div className="border-t border-buksu-maroon-light p-3">
          <div className={`mb-2 px-2 py-1.5 rounded-lg bg-white/10 ${collapsed ? "md:hidden" : ""}`}>
            <p className="text-xs font-semibold text-white truncate">
              {userProfile?.name || "User"}
            </p>
            <p className="text-[10px] text-white/50 capitalize truncate">
              {userProfile?.role} · {userProfile?.officeDepartment || "PPMU"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/70 hover:bg-red-700/60 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>Sign Out</span>
          </button>
        </div>

        {/* Collapse toggle — desktop only, mobile uses the X button instead */}
        <button
          onClick={onToggle}
          className="hidden md:flex absolute -right-3 top-20 bg-buksu-maroon border border-buksu-maroon-light rounded-full p-1 text-white hover:bg-buksu-maroon-light transition-colors"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </aside>
    </>
  );
}