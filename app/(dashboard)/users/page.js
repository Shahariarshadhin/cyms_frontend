"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, KeyRound, Trash2, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import RoleBadge from "@/components/RoleBadge";
import { getUser } from "@/lib/auth";

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  SALES: "Sales",
  INVENTORY_MANAGER: "Inventory Manager",
  ACCOUNTS: "Accounts",
};

const emptyForm = { name: "", email: "", password: "", role: "SALES" };

export default function UsersPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pwModalUser, setPwModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    setMe(getUser());
  }, []);

  const load = async () => {
    try {
      const { data } = await api.get("/users", { params: { search } });
      setUsers(data.users);
      setRoles(data.roles);
      setForbidden(false);
    } catch (err) {
      if (err?.response?.status === 403) setForbidden(true);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  const openNew = () => { setForm(emptyForm); setError(""); setModalOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/users", form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (id, role) => {
    try {
      await api.put(`/users/${id}`, { role });
      load();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update role");
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      load();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update status");
    }
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return;
    await api.put(`/users/${pwModalUser._id}/password`, { password: newPassword });
    setPwModalUser(null);
    setNewPassword("");
  };

  const removeUser = async (u) => {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      load();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete user");
    }
  };

  if (forbidden) {
    return (
      <div className="card max-w-md mx-auto text-center py-10">
        <ShieldAlert className="mx-auto text-slate-300 mb-3" size={36} />
        <p className="font-medium text-slate-700">Only Super Admin can manage users</p>
        <p className="text-sm text-slate-400 mt-1">Ask your Super Admin to grant you access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add User</button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = me?.id === u._id;
              return (
                <tr key={u._id} className="border-b border-slate-50 last:border-0">
                  <td className="p-3 font-medium text-slate-800">
                    {u.name} {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                  </td>
                  <td className="p-3 text-slate-600">{u.email}</td>
                  <td className="p-3">
                    <select
                      className="input !py-1 !text-xs !w-auto"
                      value={u.role}
                      disabled={isSelf}
                      onChange={(e) => changeRole(u._id, e.target.value)}
                    >
                      {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <button
                      disabled={isSelf}
                      onClick={() => toggleActive(u)}
                      className={`badge ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"} ${isSelf ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setPwModalUser(u)} className="text-slate-400 hover:text-brand-600" title="Reset password">
                        <KeyRound size={16} />
                      </button>
                      {!isSelf && (
                        <button onClick={() => removeUser(u)} className="text-slate-400 hover:text-red-600" title="Delete user">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add User">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Temporary Password</label>
            <input type="password" className="input" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Create User"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!pwModalUser} onClose={() => setPwModalUser(null)} title={`Reset password — ${pwModalUser?.name || ""}`}>
        <div className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setPwModalUser(null)}>Cancel</button>
            <button className="btn-primary" onClick={resetPassword}>Update Password</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}