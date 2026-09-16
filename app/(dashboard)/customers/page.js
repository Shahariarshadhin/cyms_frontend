"use client";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import { formatBDT } from "@/lib/auth";

const emptyForm = { name: "", phone: "", alternativePhone: "", email: "", address: "", district: "", city: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get("/customers", { params: { search } });
    setCustomers(data.customers);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/customers", form);
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } finally {
      setSaving(false);
    }
  };

  const openProfile = async (c) => {
    const { data } = await api.get(`/customers/${c._id}`);
    setProfile(data);
    setProfileOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, phone, address..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Customer</button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Code</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Address</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer" onClick={() => openProfile(c)}>
                <td className="p-3 text-slate-500">{c.customerCode}</td>
                <td className="p-3 font-medium text-slate-800">{c.name}</td>
                <td className="p-3 text-slate-600">{c.phone}</td>
                <td className="p-3 text-slate-500">{c.address}</td>
                <td className="p-3 text-brand-600 text-xs font-medium">View</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Customer">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Alternative Phone</label>
              <input className="input" value={form.alternativePhone} onChange={(e) => setForm({ ...form, alternativePhone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">District</label>
              <input className="input" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Customer"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title={profile?.customer?.name} wide>
        {profile && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="card"><p className="text-xs text-slate-400">Phone</p><p className="font-medium">{profile.customer.phone}</p></div>
              <div className="card"><p className="text-xs text-slate-400">Total Orders</p><p className="font-medium">{profile.totalOrders}</p></div>
              <div className="card"><p className="text-xs text-slate-400">Total Purchase</p><p className="font-medium">{formatBDT(profile.totalPurchase)}</p></div>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Order History</h4>
              <table className="w-full text-sm">
                <tbody>
                  {profile.orders.map((o) => (
                    <tr key={o._id} className="border-b border-slate-50">
                      <td className="py-2 font-medium">{o.orderNumber}</td>
                      <td className="py-2 text-slate-500">{new Date(o.orderDate).toLocaleDateString()}</td>
                      <td className="py-2 text-right">{formatBDT(o.totalAmount)}</td>
                    </tr>
                  ))}
                  {profile.orders.length === 0 && <tr><td className="py-4 text-slate-400 text-center">No orders yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
