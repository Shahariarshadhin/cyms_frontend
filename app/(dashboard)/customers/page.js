"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Phone, MapPin, ChevronRight, Users } from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import { formatBDT } from "@/lib/auth";

const emptyForm = {
  name: "",
  phone: "",
  alternativePhone: "",
  email: "",
  address: "",
  district: "",
  city: "",
};

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];
function avatarColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

function Avatar({ name, size = "w-10 h-10", text = "text-sm" }) {
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-semibold shrink-0 ${text} ${avatarColor(
        name || "?"
      )}`}
    >
      {initials(name)}
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/customers", { params: { search } });
      setCustomers(data.customers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [search]);

  const withDistrict = useMemo(
    () => new Set(customers.map((c) => c.district).filter(Boolean)).size,
    [customers]
  );

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
    setProfileOpen(true);
    setProfileLoading(true);
    setProfile(null);
    try {
      const { data } = await api.get(`/customers/${c._id}`);
      setProfile(data);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card !p-3 !px-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Customers</p>
            <p className="font-semibold text-lg">{customers.length}</p>
          </div>
        </div>
        <div className="card !p-3 !px-4 col-span-2 sm:col-span-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <MapPin size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Districts Covered</p>
            <p className="font-semibold text-lg">{withDistrict}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input !pl-9 w-full"
            placeholder="Search by name, phone, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2 justify-center shrink-0"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Desktop / tablet table */}
      <div className="card overflow-x-auto p-0 hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Code</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Address</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Loading customers...
                </td>
              </tr>
            )}
            {!loading &&
              customers.map((c) => (
                <tr
                  key={c._id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors"
                  onClick={() => openProfile(c)}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <span className="font-medium text-slate-800">
                        {c.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-500">{c.customerCode}</td>
                  <td className="p-3 text-slate-600">{c.phone}</td>
                  <td className="p-3 text-slate-500">{c.address || "—"}</td>
                  <td className="p-3 text-right">
                    <span className="text-brand-600 text-xs font-medium inline-flex items-center gap-1">
                      View <ChevronRight size={13} />
                    </span>
                  </td>
                </tr>
              ))}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2 md:hidden">
        {loading && (
          <div className="card text-center text-slate-400 py-6">
            Loading customers...
          </div>
        )}
        {!loading &&
          customers.map((c) => (
            <button
              key={c._id}
              onClick={() => openProfile(c)}
              className="card !p-4 w-full text-left flex items-center gap-3 hover:bg-slate-50/60 transition-colors"
            >
              <Avatar name={c.name} size="w-12 h-12" text="text-base" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-800 truncate">
                    {c.name}
                  </p>
                  <span className="text-xs text-slate-400 shrink-0">
                    {c.customerCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone size={11} /> {c.phone}
                </p>
                {c.address && (
                  <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                    <MapPin size={11} className="shrink-0" /> {c.address}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            </button>
          ))}
        {!loading && customers.length === 0 && (
          <div className="card text-center text-slate-400 py-6">
            No customers found.
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Customer"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Alternative Phone</label>
              <input
                className="input"
                value={form.alternativePhone}
                onChange={(e) =>
                  setForm({ ...form, alternativePhone: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              className="input"
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">District</label>
              <input
                className="input"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                className="input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={profile?.customer?.name || "Customer Profile"}
        wide
      >
        {profileLoading && (
          <div className="text-center text-slate-400 py-10">
            Loading profile...
          </div>
        )}
        {!profileLoading && profile && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar
                name={profile.customer.name}
                size="w-14 h-14"
                text="text-lg"
              />
              <div>
                <p className="font-semibold text-slate-800 text-lg">
                  {profile.customer.name}
                </p>
                <p className="text-xs text-slate-400">
                  {profile.customer.customerCode}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="card !p-3 !px-4">
                <p className="text-xs text-slate-400">Phone</p>
                <p className="font-medium">{profile.customer.phone}</p>
              </div>
              <div className="card !p-3 !px-4">
                <p className="text-xs text-slate-400">Total Orders</p>
                <p className="font-medium">{profile.totalOrders}</p>
              </div>
              <div className="card !p-3 !px-4 col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-400">Total Purchase</p>
                <p className="font-medium">
                  {formatBDT(profile.totalPurchase)}
                </p>
              </div>
            </div>

            {(profile.customer.address ||
              profile.customer.district ||
              profile.customer.city) && (
              <div className="card !p-3 !px-4 flex items-start gap-2">
                <MapPin size={15} className="text-slate-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">
                  {[
                    profile.customer.address,
                    profile.customer.city,
                    profile.customer.district,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-sm mb-2 text-slate-700">
                Order History
              </h4>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {profile.orders.map((o) => (
                      <tr
                        key={o._id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="py-2 font-medium text-slate-700">
                          {o.orderNumber}
                        </td>
                        <td className="py-2 text-slate-500">
                          {new Date(o.orderDate).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatBDT(o.totalAmount)}
                        </td>
                      </tr>
                    ))}
                    {profile.orders.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-4 text-slate-400 text-center"
                        >
                          No orders yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Mobile list */}
              <div className="space-y-2 sm:hidden">
                {profile.orders.map((o) => (
                  <div
                    key={o._id}
                    className="flex items-center justify-between border-b border-slate-50 last:border-0 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-700">
                        {o.orderNumber}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(o.orderDate).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-medium">{formatBDT(o.totalAmount)}</p>
                  </div>
                ))}
                {profile.orders.length === 0 && (
                  <p className="text-slate-400 text-center py-4 text-sm">
                    No orders yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
