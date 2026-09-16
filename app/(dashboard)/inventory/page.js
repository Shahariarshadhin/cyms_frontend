"use client";
import { useEffect, useState } from "react";
import { Plus, Search, PackagePlus } from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { formatBDT } from "@/lib/auth";

const emptyForm = {
  productId: "",
  quantity: 1,
  purchasePrice: "",
  additionalCost: "",
  supplier: "",
  location: "WAREHOUSE",
};

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restockContext, setRestockContext] = useState(null); // product being restocked, if opened from a row
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await api.get("/inventory", {
      params: { search, status },
    });
    setItems(data.items);
  };
  const loadProducts = async () => {
    const { data } = await api.get("/products", { params: { limit: 200 } });
    setProducts(data.products);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [search, status]);
  useEffect(() => {
    loadProducts();
  }, []);

  const openAddStock = () => {
    setRestockContext(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  // Quick restock for a specific product, triggered from a row's product
  const openRestockFor = (product) => {
    setRestockContext(product);
    setForm({
      productId: product._id,
      quantity: 1,
      purchasePrice: "",
      additionalCost: "",
      supplier: "",
      location: "WAREHOUSE",
    });
    setError("");
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/inventory", {
        ...form,
        quantity: Number(form.quantity) || 1,
        purchasePrice:
          form.purchasePrice === "" ? undefined : Number(form.purchasePrice),
        additionalCost:
          form.additionalCost === "" ? undefined : Number(form.additionalCost),
      });
      setModalOpen(false);
      setForm(emptyForm);
      load();
      loadProducts();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add stock");
    } finally {
      setSaving(false);
    }
  };

  const adjust = async (id, newStatus) => {
    await api.post(`/inventory/${id}/adjust`, {
      status: newStatus,
      notes: `Manually set to ${newStatus}`,
    });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input pl-9"
              placeholder="Search Inventory ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input !w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            {[
              "IN_STOCK",
              "RESERVED",
              "SOLD",
              "RETURNED",
              "DAMAGED",
              "LOST",
              "CANCELLED",
            ].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={openAddStock}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add Stock
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Inventory ID</th>
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium">Total Cost</th>
              <th className="p-3 font-medium">Location</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr
                key={it._id}
                className="border-b border-slate-50 last:border-0"
              >
                <td className="p-3 font-medium text-slate-700">
                  {it.inventoryCode}
                </td>
                <td className="p-3 text-slate-600">{it.product?.watchName}</td>
                <td className="p-3 text-slate-600">
                  {formatBDT(it.totalCost)}
                </td>
                <td className="p-3 text-slate-500">
                  {(it.location || "").replace("_", " ")}
                </td>
                <td className="p-3">
                  <StatusBadge status={it.status} />
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1"
                      onClick={() => openRestockFor(it.product)}
                      title="Add more stock for this product"
                    >
                      <PackagePlus size={14} /> Restock
                    </button>
                    {it.status === "IN_STOCK" && (
                      <>
                        <button
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => adjust(it._id, "DAMAGED")}
                        >
                          Mark Damaged
                        </button>
                        <button
                          className="text-xs text-slate-500 hover:underline"
                          onClick={() => adjust(it._id, "LOST")}
                        >
                          Mark Lost
                        </button>
                      </>
                    )}
                    {(it.status === "DAMAGED" ||
                      it.status === "LOST" ||
                      it.status === "RETURNED") && (
                      <button
                        className="text-xs text-brand-600 hover:underline"
                        onClick={() => adjust(it._id, "IN_STOCK")}
                      >
                        Restore to Stock
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  No inventory items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          restockContext ? `Restock — ${restockContext.watchName}` : "Add Stock"
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Product</label>
            <select
              className="input"
              required
              disabled={!!restockContext}
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.watchName} ({p.sku}) — {p.quantity} in stock
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                min="1"
                className="input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Location</label>
              <select
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              >
                {[
                  "WAREHOUSE",
                  "OFFICE",
                  "SALES_TEAM",
                  "COURIER",
                  "CUSTOMER",
                ].map((l) => (
                  <option key={l} value={l}>
                    {l.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Purchase Price (optional override)
              </label>
              <input
                type="number"
                className="input"
                value={form.purchasePrice}
                onChange={(e) =>
                  setForm({ ...form, purchasePrice: e.target.value })
                }
                placeholder="Use product default"
              />
            </div>
            <div>
              <label className="label">
                Additional Cost (optional override)
              </label>
              <input
                type="number"
                className="input"
                value={form.additionalCost}
                onChange={(e) =>
                  setForm({ ...form, additionalCost: e.target.value })
                }
                placeholder="Use product default"
              />
            </div>
          </div>
          <div>
            <label className="label">Supplier</label>
            <input
              className="input"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Add Stock"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
