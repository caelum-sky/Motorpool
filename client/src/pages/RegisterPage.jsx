// src/pages/RegisterPage.jsx
// Self-service sign-up for university staff requesting motorpool access.
// New accounts are created with role "staff" by default — admins can
// upgrade roles later from the Users page.

import { useState }                          from "react";
import { useNavigate, Link }                 from "react-router-dom";
import { createUserWithEmailAndPassword }    from "firebase/auth";
import { doc, setDoc }                       from "firebase/firestore";
import { auth, db }                          from "../utils/firebase";
import { Bus, Mail, Lock, User, Building2 }  from "lucide-react";
import toast                                 from "react-hot-toast";

const OFFICES = [
  "Office of the University President",
  "Office of the Vice President for Academic Affairs",
  "Office of the University Registrar",
  "College of Arts and Sciences",
  "College of Education",
  "College of Engineering and Information Technology",
  "College of Agriculture",
  "College of Technology",
  "Office of Student Affairs and Services",
  "Human Resource Management Office",
  "Accounting Office",
  "Budget Office",
  "Supply Office",
  "PPMU - Motorpool Section",
  "PPMU - General Services",
  "University Library",
  "Information and Communications Technology Office",
  "Other",
];

const EMPTY_FORM = {
  name: "", email: "", password: "", confirmPassword: "",
  officeDepartment: "", customOffice: "",
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      return toast.error("Passwords do not match.");
    }
    if (form.password.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    const office = form.officeDepartment === "Other" ? form.customOffice : form.officeDepartment;
    if (!office) {
      return toast.error("Please select or enter your office/department.");
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // Create the Firestore profile — default role is "staff"
      await setDoc(doc(db, "users", cred.user.uid), {
        name: form.name,
        email: form.email,
        role: "staff",
        officeDepartment: office,
        createdAt: new Date(),
      });

      toast.success("Account created! Welcome to BukSU Motorpool.");
      navigate("/dashboard");
    } catch (err) {
      const messages = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email":        "Please enter a valid email address.",
        "auth/weak-password":        "Password is too weak. Use at least 6 characters.",
      };
      toast.error(messages[err.code] || "Registration failed. Please try again.");
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
          <div className="bg-buksu-maroon px-8 py-7 text-center">
            <div className="w-14 h-14 bg-buksu-gold rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Bus className="w-7 h-7 text-buksu-maroon-dark" />
            </div>
            <h1 className="text-lg font-bold text-white">Create an Account</h1>
            <p className="text-xs text-white/60 mt-1">Submit trip requests for your office</p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="px-8 py-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" required value={form.name} onChange={f("name")}
                  placeholder="Juan Dela Cruz"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" required value={form.email} onChange={f("email")}
                  placeholder="you@buksu.edu.ph"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Office / Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  required value={form.officeDepartment} onChange={f("officeDepartment")}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon"
                >
                  <option value="">Select your office…</option>
                  {OFFICES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {form.officeDepartment === "Other" && (
              <input
                type="text" required value={form.customOffice} onChange={f("customOffice")}
                placeholder="Enter your office/department name"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon"
              />
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password" required value={form.password} onChange={f("password")}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password" required value={form.confirmPassword} onChange={f("confirmPassword")}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-buksu-maroon text-white font-medium py-2.5 rounded-lg hover:bg-buksu-maroon-dark transition disabled:opacity-60 mt-2"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 pb-5">
            Already have an account?{" "}
            <Link to="/login" className="text-buksu-maroon font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Bukidnon State University · PPMU Motorpool
        </p>
      </div>
    </div>
  );
}
