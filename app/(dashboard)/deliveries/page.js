"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatBDT } from "@/lib/auth";

const STATUSES = ["PENDING", "PACKED", "SHIPPED", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"];

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    const { data } = await api.get("/deliveries", { params: { status } });
    setDeliveries(data.deliveries);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const updateField = async (id, patch) => {
    await api.put(`/deliveries/${id}`, patch);
    load();
  };

  return (
    <div className="space-y-5">
      <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All Status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
      </select>

      <div className="card overflow-x-auto p-0">
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
            {deliveries.map((d) => (
              <tr key={d._id} className="border-b border-slate-50 last:border-0">
                <td className="p-3 font-medium text-slate-800">{d.order?.orderNumber}</td>
                <td className="p-3 text-slate-600">{d.customer?.name}</td>
                <td className="p-3">
                  <input className="input !py-1 !text-xs" defaultValue={d.courier} placeholder="Courier"
                    onBlur={(e) => e.target.value !== d.courier && updateField(d._id, { courier: e.target.value })} />
                </td>
                <td className="p-3">
                  <input className="input !py-1 !text-xs" defaultValue={d.trackingNumber} placeholder="Tracking #"
                    onBlur={(e) => e.target.value !== d.trackingNumber && updateField(d._id, { trackingNumber: e.target.value })} />
                </td>
                <td className="p-3"><StatusBadge status={d.status} /></td>
                <td className="p-3">
                  <select className="input !py-1 !text-xs !w-auto" value={d.status} onChange={(e) => updateField(d._id, { status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400">No deliveries found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
