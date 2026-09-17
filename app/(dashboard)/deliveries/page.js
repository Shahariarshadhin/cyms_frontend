"use client";
import { useEffect, useMemo, useState } from "react";
import { Truck, PackageCheck, AlertTriangle, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatBDT } from "@/lib/auth";

const STATUSES = ["PENDING", "PACKED", "SHIPPED", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"];
const ISSUE_STATUSES = ["FAILED", "RETURNED"];
const IN_MOTION_STATUSES = ["PACKED", "SHIPPED", "IN_TRANSIT"];

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/deliveries", { params: { status } });
      setDeliveries(data.deliveries);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const updateField = async (id, patch) => {
    await api.put(`/deliveries/${id}`, patch);
    load();
  };

  const stats = useMemo(() => {
    const inMotion = deliveries.filter((d) => IN_MOTION_STATUSES.includes(d.status)).length;
    const delivered = deliveries.filter((d) => d.status === "DELIVERED").length;
    const issues = deliveries.filter((d) => ISSUE_STATUSES.includes(d.status)).length;
    return { total: deliveries.length, inMotion, delivered, issues };
  }, [deliveries]);

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card !p-3 !px-4">
          <p className="text-xs text-slate-400">Total</p>
          <p className="font-semibold text-lg">{stats.total}</p>
        </div>
        <div className="card !p-3 !px-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Truck size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">In Motion</p>
            <p className="font-semibold text-lg text-sky-600">{stats.inMotion}</p>
          </div>
        </div>
        <div className="card !p-3 !px-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <PackageCheck size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Delivered</p>
            <p className="font-semibold text-lg text-emerald-600">{stats.delivered}</p>
          </div>
        </div>
        <div className="card !p-3 !px-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Issues</p>
            <p className="font-semibold text-lg text-red-600">{stats.issues}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="relative sm:w-56">
        <select
          className="input w-full appearance-none pr-9"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>

      {/* Desktop / tablet table */}
      <div className="card overflow-x-auto p-0 hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Order</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Courier</th>
              <th className="p-3 font-medium">Tracking</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Update</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">Loading deliveries...</td></tr>
            )}
            {!loading && deliveries.map((d) => (
              <tr key={d._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                <td className="p-3 font-medium text-slate-800">{d.order?.orderNumber}</td>
                <td className="p-3 text-slate-600">{d.customer?.name}</td>
                <td className="p-3">
                  <input className="input !py-1.5 !text-xs w-full" defaultValue={d.courier} placeholder="Courier"
                    onBlur={(e) => e.target.value !== d.courier && updateField(d._id, { courier: e.target.value })} />
                </td>
                <td className="p-3">
                  <input className="input !py-1.5 !text-xs w-full" defaultValue={d.trackingNumber} placeholder="Tracking #"
                    onBlur={(e) => e.target.value !== d.trackingNumber && updateField(d._id, { trackingNumber: e.target.value })} />
                </td>
                <td className="p-3"><StatusBadge status={d.status} /></td>
                <td className="p-3">
                  <div className="relative">
                    <select className="input !py-1.5 !text-xs w-full appearance-none pr-7" value={d.status} onChange={(e) => updateField(d._id, { status: e.target.value })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </td>
              </tr>
            ))}
            {!loading && deliveries.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">No deliveries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2 md:hidden">
        {loading && <div className="card text-center text-slate-400 py-6">Loading deliveries...</div>}
        {!loading && deliveries.map((d) => (
          <div key={d._id} className="card !p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{d.order?.orderNumber}</p>
                <p className="text-xs text-slate-500 truncate">{d.customer?.name}</p>
              </div>
              <StatusBadge status={d.status} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Courier</label>
                <input
                  className="input !py-1.5 !text-xs w-full"
                  defaultValue={d.courier}
                  placeholder="Courier"
                  onBlur={(e) => e.target.value !== d.courier && updateField(d._id, { courier: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tracking #</label>
                <input
                  className="input !py-1.5 !text-xs w-full"
                  defaultValue={d.trackingNumber}
                  placeholder="Tracking #"
                  onBlur={(e) => e.target.value !== d.trackingNumber && updateField(d._id, { trackingNumber: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Update Status</label>
              <div className="relative">
                <select
                  className="input !py-1.5 !text-xs w-full appearance-none pr-8"
                  value={d.status}
                  onChange={(e) => updateField(d._id, { status: e.target.value })}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        ))}
        {!loading && deliveries.length === 0 && (
          <div className="card text-center text-slate-400 py-6">No deliveries found.</div>
        )}
      </div>
    </div>
  );
}