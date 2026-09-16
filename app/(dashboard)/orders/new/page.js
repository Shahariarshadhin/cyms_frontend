"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Search,
  UserPlus,
  Users,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatBDT } from "@/lib/auth";

const emptyNewCustomer = {
  name: "",
  phone: "",
  alternativePhone: "",
  email: "",
  address: "",
  district: "",
  city: "",
};

export default function NewOrderPage() {
  const router = useRouter();

  const [customerMode, setCustomerMode] = useState("existing"); // "existing" | "new"
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomer, setNewCustomer] = useState(emptyNewCustomer);

  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    if (customerMode === "existing") {
      api
        .get("/customers", { params: { search: customerSearch, limit: 20 } })
        .then((r) => setCustomers(r.data.customers));
    }
  }, [customerSearch, customerMode]);

  useEffect(() => {
    api
      .get("/products", { params: { limit: 200 } })
      .then((r) => setProducts(r.data.products));
  }, []);

  const addItem = () =>
    setItems([...items, { product: "", quantity: 1, unitPrice: 0 }]);
  const updateItem = (i, patch) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    if (patch.product) {
      const p = products.find((pr) => pr._id === patch.product);
      if (p) next[i].unitPrice = p.estSellingMin || p.purchasePrice;
    }
    setItems(next);
  };
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const subtotal = items.reduce(
    (s, it) => s + (it.unitPrice || 0) * (it.quantity || 1),
    0
  );
  const grandTotal = subtotal - Number(discount) + Number(deliveryCharge);

  const resetForm = () => {
    setConfirmation(null);
    setCustomerMode("existing");
    setCustomerId("");
    setCustomerSearch("");
    setNewCustomer(emptyNewCustomer);
    setItems([]);
    setDiscount(0);
    setDeliveryCharge(0);
    setNotes("");
    setError("");
  };

  const submit = async () => {
    setError("");

    if (customerMode === "existing" && !customerId)
      return setError("Please select a customer");
    if (customerMode === "new" && (!newCustomer.name || !newCustomer.phone)) {
      return setError(
        "Customer name and phone are required to place the order"
      );
    }
    if (items.length === 0) return setError("Add at least one item");
    if (items.some((it) => !it.product))
      return setError("Select a product for every item row");

    setSaving(true);
    try {
      let finalCustomerId = customerId;

      // A brand-new customer is created here, which is exactly how they land in the Customers section.
      if (customerMode === "new") {
        const { data: createdCustomer } = await api.post(
          "/customers",
          newCustomer
        );
        finalCustomerId = createdCustomer._id;
      }

      const { data: order } = await api.post("/orders", {
        customer: finalCustomerId,
        items,
        discount: Number(discount),
        deliveryCharge: Number(deliveryCharge),
        notes,
      });

      // Fetch full order detail (includes full customer record) for the confirmation screen.
      const { data: detail } = await api.get(`/orders/${order._id}`);
      setConfirmation(detail);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create order");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Order confirmation screen ----------
  if (confirmation) {
    const { order } = confirmation;
    const c = order.customer;
    return (
      <div className="space-y-5 max-w-2xl">
        <div className="card border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={28} />
            <div>
              <p className="font-semibold text-slate-900">
                Order {order.orderNumber} placed successfully
              </p>
              <p className="text-sm text-slate-500">
                Confirm the details below before proceeding.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-medium text-sm text-slate-500 mb-3">
            Customer Information
          </h4>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label="Name" value={c?.name} />
            <Field label="Customer Code" value={c?.customerCode} />
            <Field label="Phone" value={c?.phone} />
            <Field
              label="Alternative Phone"
              value={c?.alternativePhone || "—"}
            />
            <Field label="Email" value={c?.email || "—"} />
            <Field
              label="District / City"
              value={[c?.district, c?.city].filter(Boolean).join(" / ") || "—"}
            />
            <div className="sm:col-span-2">
              <Field label="Address" value={c?.address || "—"} />
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-medium text-sm text-slate-500 mb-3">
            Order Summary
          </h4>
          {order.items.map((it, i) => (
            <div
              key={i}
              className="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0"
            >
              <span>
                {it.productName} × {it.quantity}
              </span>
              <span>{formatBDT(it.unitPrice * it.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-slate-100 mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatBDT(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span>-{formatBDT(order.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Delivery</span>
              <span>+{formatBDT(order.deliveryCharge)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Grand Total</span>
              <span>{formatBDT(order.totalAmount)}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} />
            <StatusBadge status={order.deliveryStatus} />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={resetForm} className="btn-secondary">
            Create Another Order
          </button>
          <button
            onClick={() => router.push("/orders")}
            className="btn-primary"
          >
            Go to Orders
          </button>
        </div>
      </div>
    );
  }

  // ---------- Order creation form ----------
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="card space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Customer</label>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  setCustomerMode("existing");
                  setError("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${
                  customerMode === "existing"
                    ? "bg-white shadow-sm text-slate-800"
                    : "text-slate-500"
                }`}
              >
                <Users size={13} /> Existing Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerMode("new");
                  setError("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${
                  customerMode === "new"
                    ? "bg-white shadow-sm text-slate-800"
                    : "text-slate-500"
                }`}
              >
                <UserPlus size={13} /> New Customer
              </button>
            </div>
          </div>

          {customerMode === "existing" ? (
            <>
              <div className="relative mb-2">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="input pl-8"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
              <select
                className="input"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  required
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input
                  className="input"
                  required
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Alternative Phone</label>
                <input
                  className="input"
                  value={newCustomer.alternativePhone}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      alternativePhone: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <textarea
                  className="input"
                  rows={2}
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, address: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">District</label>
                <input
                  className="input"
                  value={newCustomer.district}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, district: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">City</label>
                <input
                  className="input"
                  value={newCustomer.city}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, city: e.target.value })
                  }
                />
              </div>
              <p className="sm:col-span-2 text-xs text-slate-400">
                This customer will be saved and appear in the Customers section
                automatically.
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Products</label>
            <button
              type="button"
              onClick={addItem}
              className="btn-secondary flex items-center gap-1 text-xs"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  className="input flex-1"
                  value={it.product}
                  onChange={(e) => updateItem(i, { product: e.target.value })}
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id} disabled={p.quantity < 1}>
                      {p.watchName} ({p.quantity} in stock)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="input w-20"
                  value={it.quantity}
                  onChange={(e) =>
                    updateItem(i, { quantity: Number(e.target.value) })
                  }
                />
                <input
                  type="number"
                  className="input w-28"
                  value={it.unitPrice}
                  onChange={(e) =>
                    updateItem(i, { unitPrice: Number(e.target.value) })
                  }
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-slate-400">No items added yet.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Discount (৳)</label>
            <input
              type="number"
              className="input"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Delivery Charge (৳)</label>
            <input
              type="number"
              className="input"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatBDT(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Discount</span>
            <span>-{formatBDT(discount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Delivery</span>
            <span>+{formatBDT(deliveryCharge)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Grand Total</span>
            <span>{formatBDT(grandTotal)}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? "Saving..." : "Save Order"}
        </button>
      </div>
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
