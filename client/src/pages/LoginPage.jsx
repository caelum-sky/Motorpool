// src/pages/LoginPage.jsx
// Firebase email/password authentication with BukSU branding.

import { useState }             from "react";
import { useNavigate, Link }    from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth }                 from "../utils/firebase";
import { Button }               from "../components/ui";
import { Bus, Lock, Mail }      from "lucide-react";
import toast                    from "react-hot-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      const messages = {
        "auth/user-not-found":   "No account found for this email.",
        "auth/wrong-password":   "Incorrect password.",
        "auth/invalid-email":    "Please enter a valid email address.",
        "auth/too-many-requests":"Too many attempts. Please try again later.",
      };
      toast.error(messages[err.code] || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-buksu-cream flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-buksu-maroon to-buksu-maroon-dark opacity-90" />

      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-buksu-maroon px-8 py-8 text-center">
            <div className="w-16 h-16 bg-buksu-gold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Bus className="w-8 h-8 text-buksu-maroon-dark" />
            </div>
            <h1 className="text-xl font-bold text-white">BukSU Motorpool</h1>
            <p className="text-xs text-white/60 mt-1">Physical Plant & Maintenance Unit</p>
            <p className="text-xs text-buksu-gold mt-0.5 font-medium">Fleet Management System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 py-7 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@buksu.edu.ph"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon"
                />
              </div>
            </div>

            <Button
              type="submit" variant="primary" className="w-full justify-center py-2.5"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 pb-5">
            Need an account?{" "}
            <Link to="/register" className="text-buksu-maroon font-medium hover:underline">
              Sign up here
            </Link>
          </p>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Bukidnon State University · IT Systems 2025
        </p>
      </div>
    </div>
  );
}