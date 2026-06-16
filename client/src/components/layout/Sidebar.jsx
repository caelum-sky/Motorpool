// src/components/layout/Sidebar.jsx
// Responsive sidebar with role-aware nav links and BukSU branding.

import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Truck, Package, FileText,
  Wrench, Users, LogOut, ChevronRight, Bus,
} from "lucide-react";
import toast from "react-hot-toast";

// Nav items: label, path, icon, allowed roles (empty = all roles)
const NAV = [
  { label: "Dashboard",    path: "/dashboard",   icon: LayoutDashboard, roles: [] },
  { label: "Vehicles",     path: "/vehicles",    icon: Truck,           roles: [] },
  { label: "Inventory",    path: "/inventory",   icon: Package,         roles: ["admin", "motorpool"] },
  { label: "Trip Tickets", path: "/trips",       icon: FileText,        roles: [] },
  { label: "Maintenance",  path: "/maintenance", icon: Wrench,          roles: ["admin", "motorpool"] },
  { label: "Users",        path: "/users",       icon: Users,           roles: ["admin"] },
];

export default function Sidebar({ collapsed, onToggle }) {
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
    <aside
      className={`
        flex flex-col h-screen bg-buksu-maroon text-white transition-all duration-200
        ${collapsed ? "w-16" : "w-60"}
        shadow-xl z-30 fixed top-0 left-0
      `}
    >
      {/* Logo / Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-buksu-maroon-light">
        <div className="flex-shrink-0 w-9 h-9 bg-buksu-gold rounded-lg flex items-center justify-center">
          <Bus className="w-5 h-5 text-buksu-maroon-dark" />
        </div>
        {!collapsed && (
          <div className="leading-tight overflow-hidden">
            <p className="font-bold text-sm text-buksu-gold truncate">BukSU Motorpool</p>
            <p className="text-[10px] text-white/60 truncate">PPMU Fleet System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleNav.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all text-sm font-medium
              ${isActive
                ? "bg-buksu-gold text-buksu-maroon-dark shadow"
                : "text-white/80 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-buksu-maroon-light p-3">
        {!collapsed && (
          <div className="mb-2 px-2 py-1.5 rounded-lg bg-white/10">
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
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/70 hover:bg-red-700/60 hover:text-white transition-colors text-sm"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 bg-buksu-maroon border border-buksu-maroon-light rounded-full p-1 text-white hover:bg-buksu-maroon-light transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`} />
      </button>
    </aside>
  );
}
