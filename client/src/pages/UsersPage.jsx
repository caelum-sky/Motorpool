// src/pages/UsersPage.jsx
// Admin-only: view, create, and manage system users across any
// role and office/department.
//
// Creating a new account goes through the Express backend (server/routes/users.js)
// because creating a Firebase Auth account for SOMEONE ELSE requires the
// Admin SDK — the client SDK can only create an account for whoever is
// currently signed in.

import { useState, useEffect }           from "react";
import { usersApi }                      from "../utils/api";
import { Card, Button, Modal, Input, Select, EmptyState, Spinner } from "../components/ui";
import { Users, RefreshCw, ShieldCheck, Plus, Trash2 } from "lucide-react";
import toast                             from "react-hot-toast";

const ROLES = ["admin", "motorpool", "driver", "staff"];

const ROLE_COLORS = {
  admin:     "bg-buksu-maroon text-white",
  motorpool: "bg-blue-600 text-white",
  driver:    "bg-emerald-600 text-white",
  staff:     "bg-gray-200 text-gray-700",
};

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
  name: "", email: "", password: "", role: "staff",
  officeDepartment: "", customOffice: "",
};

export default function UsersPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(null);
  const [modal,   setModal]   = useState(null);   // null | 'create'
  const [confirm, setConfirm] = useState(null);   // uid pending delete
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [creating,setCreating]= useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.getAll());
    } catch (err) {
      toast.error("Failed to load users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (uid, newRole) => {
    setSaving(uid);
    try {
      await usersApi.updateRole(uid, newRole);
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u));
      toast.success("Role updated.");
    } catch (err) {
      toast.error("Failed to update role: " + err.message);
    } finally {
      setSaving(null);
    }
  };

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const openCreate = () => { setForm(EMPTY_FORM); setModal("create"); };

  const handleCreate = async () => {
    const office = form.officeDepartment === "Other" ? form.customOffice : form.officeDepartment;

    if (!form.name || !form.email || !form.password) {
      return toast.error("Name, email, and password are required.");
    }
    if (form.password.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    if (!office) {
      return toast.error("Please select or enter an office/department.");
    }

    setCreating(true);
    try {
      await usersApi.create({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        officeDepartment: office,
      });
      toast.success(`Account created for ${form.name} (${form.role}).`);
      setModal(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (uid) => {
    try {
      await usersApi.delete(uid);
      toast.success("User deleted.");
      setConfirm(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Users</h1>
          <p className="text-sm text-gray-500">{users.length} registered users</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button onClick={openCreate} variant="primary">
            <Plus className="w-4 h-4" /> Create User
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex gap-3">
        <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Two ways to add accounts</p>
          <p className="text-xs mt-0.5 text-blue-600">
            Use <strong>Create User</strong> above to add an account for any role and office on someone's behalf.
            Staff from any department can also self-register at <code className="bg-blue-100 px-1 rounded">/register</code> —
            their account defaults to the "staff" role, which you can upgrade here anytime.
          </p>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found"
            description="Create the first account using the button above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Name", "Email", "Office / Department", "Role", "Update Role", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.uid} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.officeDepartment || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}`}>
                        {u.role || "unset"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role || ""}
                        onChange={(e) => changeRole(u.uid, e.target.value)}
                        disabled={saving === u.uid}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 capitalize disabled:opacity-50"
                      >
                        {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirm(u.uid)}
                        className="p-1.5 rounded-lg text-red-300 hover:bg-red-50 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create User Modal */}
      <Modal open={modal === "create"} onClose={() => setModal(null)} title="Create New User Account" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name *" value={form.name} onChange={f("name")} placeholder="Juan Dela Cruz" className="col-span-2" />
          <Input label="Email *" type="email" value={form.email} onChange={f("email")} placeholder="user@buksu.edu.ph" className="col-span-2" />
          <Input label="Temporary Password *" type="password" value={form.password} onChange={f("password")} placeholder="At least 6 characters" />
          <Select label="Role *" value={form.role} onChange={f("role")}>
            {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
          </Select>
          <Select label="Office / Department *" value={form.officeDepartment} onChange={f("officeDepartment")} className="col-span-2">
            <option value="">Select office…</option>
            {OFFICES.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
          {form.officeDepartment === "Other" && (
            <Input label="Custom Office Name *" value={form.customOffice} onChange={f("customOffice")}
              placeholder="Enter office/department name" className="col-span-2" />
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mt-4 text-xs text-gray-500">
          The user can sign in immediately with this email and password. Share the credentials with them securely;
          they can change their password later from Firebase if you enable that flow.
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating…" : "Create Account"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete User?" size="sm">
        <p className="text-sm text-gray-600">
          This permanently deletes the user's login and profile. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => handleDelete(confirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}