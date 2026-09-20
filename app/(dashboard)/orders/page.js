"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Receipt,
  Wallet,
  AlertCircle,
  Trash2,
  FileDown,
} from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { formatBDT } from "@/lib/auth";

const ORDER_STATUSES = [
  "CONFIRMED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  // Whether the customer's coupon code should be printed on the invoice —
  // off by default, toggled per download.
  const [includeCoupon, setIncludeCoupon] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/orders", { params: { search } });
      setOrders(data.orders);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [search]);

  const stats = useMemo(() => {
    // Cancelled orders shouldn't contribute revenue, due, or unpaid counts —
    // there's nothing outstanding to collect on them.
    const active = orders.filter((o) => o.status !== "CANCELLED");
    const totalRevenue = active.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalDue = active.reduce((s, o) => s + (o.dueAmount || 0), 0);
    const unpaidCount = active.filter((o) => (o.dueAmount || 0) > 0).length;
    return { count: orders.length, totalRevenue, totalDue, unpaidCount };
  }, [orders]);

  const openDetail = async (o) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setConfirmingDelete(false);
    setDeleteError("");
    setIncludeCoupon(false);
    try {
      const { data } = await api.get(`/orders/${o._id}`);
      setDetail(data);
      setPayAmount("");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setConfirmingDelete(false);
    setDeleteError("");
  };

  const recordPayment = async () => {
    if (!payAmount) return;
    await api.post("/payments", {
      order: detail.order._id,
      amount: Number(payAmount),
      method: payMethod,
    });
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

  // window.open() hits the URL directly and skips whatever `api` does to
  // attach the auth token, so the server rejects it as unauthorized. Fetch
  // it through `api` instead (token included) and save the response as a
  // file ourselves.
  const downloadInvoice = async () => {
    setDownloadingInvoice(true);
    try {
      const res = await api.get(`/orders/${detail.order._id}/invoice`, {
        responseType: "blob",
        params: { showCoupon: includeCoupon },
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${detail.order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let message = "Failed to download invoice";
      if (err?.response?.data instanceof Blob) {
        try {
          message =
            JSON.parse(await err.response.data.text())?.message || message;
        } catch {}
      }
      alert(message);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const deleteOrder = async () => {
    setDeleteError("");
    setDeleting(true);
    try {
      await api.delete(`/orders/${detail.order._id}`);
      setDetailOpen(false);
      setConfirmingDelete(false);
      load();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card !p-3 !px-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Receipt size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Orders</p>
            <p className="font-semibold text-lg">{stats.count}</p>
          </div>
        </div>
        <div className="card !p-3 !px-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Total Revenue</p>
            <p className="font-semibold text-lg truncate">
              {formatBDT(stats.totalRevenue)}
            </p>
          </div>
        </div>
        <div className="card !p-3 !px-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Total Due</p>
            <p className="font-semibold text-lg text-amber-600 truncate">
              {formatBDT(stats.totalDue)}
            </p>
          </div>
        </div>
        <div className="card !p-3 !px-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-400">Unpaid Orders</p>
          <p className="font-semibold text-lg">{stats.unpaidCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input !pl-9 w-full"
            placeholder="Search order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link
          href="/orders/new"
          className="btn-primary flex items-center gap-2 justify-center w-full sm:w-fit shrink-0"
        >
          <Plus size={16} /> New Order
        </Link>
      </div>

      {/* Desktop / tablet table */}
      <div className="card overflow-x-auto p-0 hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Order ID</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium text-right">Amount</th>
              <th className="p-3 font-medium">Payment</th>
              <th className="p-3 font-medium">Delivery</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400">
                  Loading orders...
                </td>
              </tr>
            )}
            {!loading &&
              orders.map((o) => (
                <tr
                  key={o._id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors"
                  onClick={() => openDetail(o)}
                >
                  <td className="p-3 font-medium text-slate-800">
                    {o.orderNumber}
                  </td>
                  <td className="p-3 text-slate-600">{o.customer?.name}</td>
                  <td className="p-3 text-slate-500">
                    {new Date(o.orderDate).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right text-slate-600">
                    {formatBDT(o.totalAmount)}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="p-3">
                    <StatusBadge status={o.deliveryStatus} />
                  </td>
                  <td className="p-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400">
                  No orders found.
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
            Loading orders...
          </div>
        )}
        {!loading &&
          orders.map((o) => (
            <button
              key={o._id}
              onClick={() => openDetail(o)}
              className="card !p-4 w-full text-left space-y-2 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{o.orderNumber}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {o.customer?.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(o.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-semibold shrink-0">
                  {formatBDT(o.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-50">
                <StatusBadge status={o.status} />
                <StatusBadge status={o.paymentStatus} />
                <StatusBadge status={o.deliveryStatus} />
              </div>
            </button>
          ))}
        {!loading && orders.length === 0 && (
          <div className="card text-center text-slate-400 py-6">
            No orders found.
          </div>
        )}
      </div>

      <Modal
        open={detailOpen}
        onClose={closeDetail}
        title={detail?.order?.orderNumber || "Order"}
        wide
      >
        {detailLoading && (
          <div className="text-center text-slate-400 py-10">
            Loading order...
          </div>
        )}
        {!detailLoading && detail && (
          <div className="space-y-5">
            <div className="card bg-slate-50/60">
              <h4 className="font-medium text-sm text-slate-500 mb-3">
                Customer Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Field label="Name" value={detail.order.customer?.name} />
                <Field
                  label="Customer Code"
                  value={detail.order.customer?.customerCode}
                />
                <Field label="Phone" value={detail.order.customer?.phone} />
                <Field
                  label="Alternative Phone"
                  value={detail.order.customer?.alternativePhone || "—"}
                />
                <Field
                  label="Email"
                  value={detail.order.customer?.email || "—"}
                />
                <Field
                  label="District / City"
                  value={
                    [
                      detail.order.customer?.district,
                      detail.order.customer?.city,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "—"
                  }
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Address"
                    value={detail.order.customer?.address || "—"}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="card !p-3 !px-4">
                <p className="text-xs text-slate-400">Total</p>
                <p className="font-medium">
                  {formatBDT(detail.order.totalAmount)}
                </p>
              </div>
              <div className="card !p-3 !px-4">
                <p className="text-xs text-slate-400">Paid</p>
                <p className="font-medium text-emerald-600">
                  {formatBDT(detail.order.paidAmount)}
                </p>
              </div>
              <div className="card !p-3 !px-4">
                <p className="text-xs text-slate-400">Due</p>
                <p
                  className={`font-medium ${
                    detail.order.dueAmount > 0 ? "text-amber-600" : ""
                  }`}
                >
                  {formatBDT(detail.order.dueAmount)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Items</h4>
              <div className="space-y-1">
                {detail.order.items.map((it, i) => (
                  <div
                    key={i}
                    className="flex justify-between gap-2 text-sm py-1.5 border-b border-slate-50 last:border-0"
                  >
                    <span className="min-w-0 truncate">
                      {it.productName}{" "}
                      <span className="text-slate-400">
                        ({it.inventoryItem?.inventoryCode})
                      </span>
                    </span>
                    <span className="shrink-0">{formatBDT(it.unitPrice)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={downloadInvoice}
                disabled={downloadingInvoice}
                className="btn-secondary flex items-center gap-2 justify-center w-full sm:w-fit disabled:opacity-60"
              >
                <FileDown size={16} />{" "}
                {downloadingInvoice ? "Preparing..." : "Download Invoice (PDF)"}
              </button>
              <label className="flex items-center gap-2 text-xs text-slate-500 select-none">
                <input
                  type="checkbox"
                  className="accent-brand-600"
                  checked={includeCoupon}
                  onChange={(e) => setIncludeCoupon(e.target.checked)}
                />
                Show coupon code on invoice
              </label>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-2">
                Order status
              </span>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={`badge border transition-colors ${
                      detail.order.status === s
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {detail.order.dueAmount > 0 && (
              <div className="card bg-slate-50/60">
                <h4 className="font-medium text-sm mb-3">Record Payment</h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    className="input flex-1"
                    placeholder={`Up to ${formatBDT(detail.order.dueAmount)}`}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                  <select
                    className="input sm:!w-32"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    {["CASH", "BKASH", "NAGAD", "BANK", "CARD", "OTHER"].map(
                      (m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      )
                    )}
                  </select>
                  <button
                    className="btn-primary shrink-0"
                    onClick={recordPayment}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              {!confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="text-red-600 text-xs font-medium hover:underline flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Delete Order
                </button>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-red-700">
                    Delete order {detail.order.orderNumber} permanently? Any
                    reserved units not yet sold will be returned to stock. This
                    can't be undone.
                  </p>
                  {deleteError && (
                    <p className="text-xs text-red-600">{deleteError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={deleteOrder}
                      disabled={deleting}
                      className="text-xs font-medium bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700 disabled:opacity-60"
                    >
                      {deleting ? "Deleting..." : "Yes, delete it"}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmingDelete(false);
                        setDeleteError("");
                      }}
                      disabled={deleting}
                      className="text-xs font-medium text-slate-600 rounded-lg px-3 py-1.5 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
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
