// src/App.jsx
// Root router — maps URL paths to pages with role-based protection.

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute   from "./components/layout/ProtectedRoute";
import AppShell         from "./components/layout/AppShell";
import LoginPage        from "./pages/LoginPage";
import RegisterPage     from "./pages/RegisterPage";
import DashboardPage    from "./pages/DashboardPage";
import VehiclesPage     from "./pages/VehiclesPage";
import InventoryPage    from "./pages/InventoryPage";
import TripTicketsPage  from "./pages/TripTicketsPage";
import CalendarPage     from "./pages/CalendarPage";
import MaintenancePage  from "./pages/MaintenancePage";
import UsersPage        from "./pages/UsersPage";
import ProfilePage      from "./pages/ProfilePage";

/**
 * AndroidBackButton — on a native Android build, the hardware/gesture back
 * button by default exits the entire app immediately, from any screen.
 * This makes it behave like users expect: go back one step in the app's
 * own navigation history, and only exit when already at the root/dashboard
 * with nowhere left to go.
 */
function AndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener;
    (async () => {
      const { App: CapApp } = await import("@capacitor/app");
      const handle = await CapApp.addListener("backButton", () => {
        const atRoot = location.pathname === "/dashboard" || location.pathname === "/login";
        if (atRoot) {
          CapApp.exitApp();
        } else {
          navigate(-1);
        }
      });
      removeListener = () => handle.remove();
    })();

    return () => removeListener?.();
  }, [location.pathname, navigate]);

  return null;
}

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-5xl mb-4">🔒</p>
        <h1 className="text-xl font-bold text-gray-800">Access Denied</h1>
        <p className="text-sm text-gray-500 mt-2">You don't have permission to view this page.</p>
        <a href="/dashboard" className="mt-4 inline-block text-sm text-buksu-maroon underline">
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AndroidBackButton />
        <Routes>
          {/* Public */}
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/register"     element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard"   element={<DashboardPage />} />
              <Route path="/vehicles"    element={<VehiclesPage />} />
              <Route path="/trips"       element={<TripTicketsPage />} />
              <Route path="/calendar"    element={<CalendarPage />} />
              <Route path="/profile"     element={<ProfilePage />} />

              {/* Admin + Motorpool + Driver */}
              <Route element={<ProtectedRoute roles={["admin", "motorpool", "driver"]} />}>
                <Route path="/inventory"   element={<InventoryPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: "13px" },
          success: { iconTheme: { primary: "#7B1C1C", secondary: "#fff" } },
        }}
      />
    </AuthProvider>
  );
}