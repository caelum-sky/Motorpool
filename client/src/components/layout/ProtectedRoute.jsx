// src/components/layout/ProtectedRoute.jsx
// Wraps routes that require authentication (and optionally specific roles).
// Usage:
//   <ProtectedRoute />                     — any logged-in user
//   <ProtectedRoute roles={['admin']} />   — only admins

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ roles }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-buksu-maroon border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If a role restriction applies, we must have a resolved profile to check
  // against. Rendering the protected page while userProfile is still null
  // would mean ANY signed-in user briefly sees admin-only content — so we
  // fail CLOSED (redirect) rather than open (render) whenever we can't yet
  // confirm the role, not just when we've confirmed it's wrong.
  if (roles) {
    if (!userProfile) return <Navigate to="/unauthorized" replace />;
    if (!roles.includes(userProfile.role)) return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}