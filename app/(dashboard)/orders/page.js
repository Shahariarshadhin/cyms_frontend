"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { formatBDT } from "@/lib/auth";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");

  const load = async () => {
    const { data } = await api.get("/orders", { params: { search } });
    setOrders(data.orders);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  const openDetail = async (o) => {
    const { data } = await api.get(`/orders/${o._id}`);
    setDetail(data);
    setPayAmount("");
    setDetailOpen(true);
  };

  const recordPayment = async () => {
    if (!payAmount) return;
    await api.post("/payments", { order: detail.order._id, amount: Number(payAmount), method: payMethod });
    const { data } = await api.get(`/orders/${detail.order._id}`);
    setDetail(data);
    setPayAmount("");
    load();
  };

  const updateStatus = async (status) => {
    await api.put(`/orders/${detail.order._id}`, { status });
    const { data } = await api.get(`/orders/${detail.order._id}`);
    setDetail(data);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search Order ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Link href="/orders/new" className="btn-primary flex items-center gap-2 w-fit"><Plus size={16} /> New Order</Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Order ID</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Payment</th>
              <th className="p-3 font-medium">Delivery</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer" onClick={() => openDetail(o)}>
                <td className="p-3 font-medium text-slate-800">{o.orderNumber}</td>
                <td className="p-3 text-slate-600">{o.customer?.name}</td>
                <td className="p-3 text-slate-500">{new Date(o.orderDate).toLocaleDateString()}</td>
                <td className="p-3 text-slate-600">{formatBDT(o.totalAmount)}</td>
                <td className="p-3"><StatusBadge status={o.paymentStatus} /></td>
                <td className="p-3"><StatusBadge status={o.deliveryStatus} /></td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-400">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail?.order?.orderNumber} wide>
        {detail && (
          <div className="space-y-5">
            <div className="card bg-slate-50/60">
              <h4 className="font-medium text-sm text-slate-500 mb-3">Customer Information</h4>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Field label="Name" value={detail.order.customer?.name} />
                <Field label="Customer Code" value={detail.order.customer?.customerCode} />
                <Field label="Phone" value={detail.order.customer?.phone} />
                <Field label="Alternative Phone" value={detail.order.customer?.alternativePhone || "—"} />
                <Field label="Email" value={detail.order.customer?.email || "—"} />
                <Field label="District / City" value={[detail.order.customer?.district, detail.order.customer?.city].filter(Boolean).join(" / ") || "—"} />
                <div className="sm:col-span-2">
                  <Field label="Address" value={detail.order.customer?.address || "—"} />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Total</p><p className="font-medium">{formatBDT(detail.order.totalAmount)}</p></div>
              <div><p className="text-xs text-slate-400">Paid</p><p className="font-medium">{formatBDT(detail.order.paidAmount)}</p></div>
              <div><p className="text-xs text-slate-400">Due</p><p className="font-medium">{formatBDT(detail.order.dueAmount)}</p></div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Items</h4>
              {detail.order.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                  <span>{it.productName} <span className="text-slate-400">({it.inventoryItem?.inventoryCode})</span></span>
                  <span>{formatBDT(it.unitPrice)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-400 mr-1">Order status:</span>
              {["CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => (
                <button key={s} onClick={() => updateStatus(s)} className={`badge border ${detail.order.status === s ? "bg-brand-600 text-white" : "bg-white border-slate-200 text-slate-500"}`}>
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {detail.order.dueAmount > 0 && (
              <div className="card bg-slate-50/60">
                <h4 className="font-medium text-sm mb-3">Record Payment</h4>
                <div className="flex gap-2">
                  <input type="number" className="input" placeholder={`Up to ${formatBDT(detail.order.dueAmount)}`} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                  <select className="input !w-32" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    {["CASH", "BKASH", "NAGAD", "BANK", "CARD", "OTHER"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button className="btn-primary" onClick={recordPayment}>Add</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}