const colorMap = {
  IN_STOCK: "bg-emerald-100 text-emerald-700", SOLD: "bg-red-100 text-red-700",
  RESERVED: "bg-amber-100 text-amber-700", RETURNED: "bg-slate-200 text-slate-700",
  DAMAGED: "bg-red-100 text-red-700", LOST: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-slate-200 text-slate-700",
  PENDING: "bg-amber-100 text-amber-700", CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-blue-100 text-blue-700", READY_TO_SHIP: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-indigo-100 text-indigo-700", DELIVERED: "bg-emerald-100 text-emerald-700",
  RETURN_REQUESTED: "bg-orange-100 text-orange-700",
  UNPAID: "bg-red-100 text-red-700", PARTIAL: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700", REFUNDED: "bg-slate-200 text-slate-700",
  PACKED: "bg-blue-100 text-blue-700", IN_TRANSIT: "bg-indigo-100 text-indigo-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }) {
  const cls = colorMap[status] || "bg-slate-100 text-slate-600";
  return <span className={`badge ${cls}`}>{(status || "").replace(/_/g, " ")}</span>;
}
