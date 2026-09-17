"use client";
import { useEffect, useState } from "react";
import { Upload, Save, ImageIcon, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { getUser } from "@/lib/auth";

const CURRENCIES = [
  { code: "BDT", symbol: "৳", label: "Bangladeshi Taka (৳)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "INR", symbol: "₹", label: "Indian Rupee (₹)" },
];

const TIMEZONES = ["Asia/Dhaka", "Asia/Kolkata", "Asia/Dubai", "UTC"];

export default function SettingsPage() {
  const [me, setMe] = useState(null);
  const [settings, setSettings] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    setMe(getUser());
    load();
  }, []);

  const load = async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
    } catch (err) {
      if (err?.response?.status === 403) setForbidden(true);
    }
  };

  const canEdit = me?.role === "SUPER_ADMIN" || me?.role === "ADMIN";

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const { data } = await api.post("/upload/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSettings((s) => ({ ...s, logo: data.url, logoPublicId: data.publicId }));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const { data } = await api.put("/settings", settings);
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return (
      <div className="card max-w-md mx-auto text-center py-10">
        <ShieldAlert className="mx-auto text-slate-300 mb-3" size={36} />
        <p className="font-medium text-slate-700">You don't have access to Settings</p>
        <p className="text-sm text-slate-400 mt-1">Only Admin and Super Admin can view or change system settings.</p>
      </div>
    );
  }

  if (!settings) return <div className="text-slate-400 text-sm">Loading settings...</div>;

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      {/* Company Info */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-900">Company Information</h3>

        <div className="flex items-center gap-4">
          {settings.logo ? (
            <img src={settings.logo} className="w-16 h-16 rounded-xl object-cover border border-slate-100" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300"><ImageIcon /></div>
          )}
          <label className={`btn-secondary flex items-center gap-2 text-xs ${canEdit ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}>
            <Upload size={14} /> {uploading ? "Uploading..." : "Upload Logo"}
            <input type="file" accept="image/*" className="hidden" disabled={!canEdit} onChange={handleLogo} />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Company Name</label>
            <input className="input" disabled={!canEdit} value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" disabled={!canEdit} value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" disabled={!canEdit} value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Timezone</label>
            <select className="input" disabled={!canEdit} value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <textarea className="input" rows={2} disabled={!canEdit} value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-900">Currency</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Currency</label>
            <select
              className="input"
              disabled={!canEdit}
              value={settings.currency}
              onChange={(e) => {
                const found = CURRENCIES.find((c) => c.code === e.target.value);
                setSettings({ ...settings, currency: e.target.value, currencySymbol: found?.symbol || settings.currencySymbol });
              }}
            >
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Currency Symbol</label>
            <input className="input" disabled={!canEdit} value={settings.currencySymbol}
              onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Prefixes */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-900">ID Prefixes</h3>
        <p className="text-xs text-slate-400 -mt-2">Used when generating new Order, Product, and Invoice numbers.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Order Prefix</label>
            <input className="input" disabled={!canEdit} value={settings.orderPrefix}
              onChange={(e) => setSettings({ ...settings, orderPrefix: e.target.value.toUpperCase() })} />
            <p className="text-xs text-slate-400 mt-1">e.g. {settings.orderPrefix}-2026-000001</p>
          </div>
          <div>
            <label className="label">Product Prefix</label>
            <input className="input" disabled={!canEdit} value={settings.productPrefix}
              onChange={(e) => setSettings({ ...settings, productPrefix: e.target.value.toUpperCase() })} />
            <p className="text-xs text-slate-400 mt-1">e.g. {settings.productPrefix}-00001</p>
          </div>
          <div>
            <label className="label">Invoice Prefix</label>
            <input className="input" disabled={!canEdit} value={settings.invoicePrefix}
              onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value.toUpperCase() })} />
            <p className="text-xs text-slate-400 mt-1">e.g. {settings.invoicePrefix}-00001</p>
          </div>
        </div>
      </div>

      {/* Order Defaults */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-900">Order Defaults</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Default Delivery Charge (৳)</label>
            <input type="number" className="input" disabled={!canEdit} value={settings.defaultDeliveryCharge}
              onChange={(e) => setSettings({ ...settings, defaultDeliveryCharge: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Default Tax (%)</label>
            <input type="number" className="input" disabled={!canEdit} value={settings.defaultTax}
              onChange={(e) => setSettings({ ...settings, defaultTax: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">Settings saved successfully.</p>}

      {canEdit ? (
        <button className="btn-primary flex items-center gap-2" disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
        </button>
      ) : (
        <p className="text-sm text-slate-400">You have read-only access to these settings.</p>
      )}
    </form>
  );
}