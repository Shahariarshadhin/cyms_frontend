"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Upload,
  Download,
  ImageIcon,
  PackagePlus,
  X,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import { formatBDT } from "@/lib/auth";

const emptyForm = {
  modelName: "",
  watchName: "",
  brand: "",
  category: "General",
  description: "",
  purchasePrice: 0,
  additionalCost: 0,
  estSellingMin: 0,
  estSellingMax: 0,
  minimumStock: 2,
  image: "",
};

const emptyRestock = {
  quantity: 1,
  purchasePrice: "",
  additionalCost: "",
  supplier: "",
  location: "WAREHOUSE",
};

function ProductThumb({
  src,
  alt,
  size = "w-10 h-10",
  rounded = "rounded-lg",
  iconSize = 16,
  onClick,
}) {
  if (!src) {
    return (
      <div
        className={`${size} ${rounded} bg-slate-100 flex items-center justify-center text-slate-300 shrink-0`}
      >
        <ImageIcon size={iconSize} />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${size} ${rounded} overflow-hidden shrink-0 ring-1 ring-slate-100 hover:ring-2 hover:ring-brand-300 transition-all focus:outline-none focus:ring-2 focus:ring-brand-400`}
      title="View larger image"
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </button>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL"); // ALL | LOW | OUT
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [restockOpen, setRestockOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockForm, setRestockForm] = useState(emptyRestock);
  const [restocking, setRestocking] = useState(false);
  const [restockError, setRestockError] = useState("");

  const [lightbox, setLightbox] = useState(null); // { src, title } | null

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/products", { params: { search } });
      setProducts(data.products);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [search]);

  // Close the lightbox on Escape
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.category).filter(Boolean))
      ).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        categoryFilter === "ALL" || p.category === categoryFilter;
      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "OUT" && p.quantity <= 0) ||
        (stockFilter === "LOW" &&
          p.quantity > 0 &&
          p.quantity <= p.minimumStock);
      return matchesCategory && matchesStock;
    });
  }, [products, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const totalValue = products.reduce(
      (s, p) =>
        s +
        ((p.purchasePrice || 0) + (p.additionalCost || 0)) * (p.quantity || 0),
      0
    );
    const lowStock = products.filter(
      (p) => p.quantity > 0 && p.quantity <= p.minimumStock
    ).length;
    const outOfStock = products.filter((p) => p.quantity <= 0).length;
    return { total: products.length, totalValue, lowStock, outOfStock };
  }, [products]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm(p);
    setModalOpen(true);
  };

  const openRestock = (p) => {
    setRestockProduct(p);
    setRestockForm(emptyRestock);
    setRestockError("");
    setRestockOpen(true);
  };

  const submitRestock = async (e) => {
    e.preventDefault();
    setRestockError("");
    setRestocking(true);
    try {
      await api.post("/inventory", {
        productId: restockProduct._id,
        quantity: Number(restockForm.quantity) || 1,
        purchasePrice:
          restockForm.purchasePrice === ""
            ? undefined
            : Number(restockForm.purchasePrice),
        additionalCost:
          restockForm.additionalCost === ""
            ? undefined
            : Number(restockForm.additionalCost),
        supplier: restockForm.supplier,
        location: restockForm.location,
      });
      setRestockOpen(false);
      load();
    } catch (err) {
      setRestockError(
        err?.response?.data?.message || "Failed to restock product"
      );
    } finally {
      setRestocking(false);
    }
  };

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const { data } = await api.post("/upload/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, image: data.url, imagePublicId: data.publicId }));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/products/${editing._id}`, form);
      else await api.post("/products", form);
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/excel/export/products`,
      "_blank"
    );
  };

  const stockBadge = (p) => {
    if (p.quantity <= 0) return "bg-red-100 text-red-700";
    if (p.quantity <= p.minimumStock) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  return (
    <div className="space-y-5">
      {/* Stock health at a glance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card !p-3 !px-4">
          <p className="text-xs text-slate-400">Products</p>
          <p className="font-semibold text-lg">{stats.total}</p>
        </div>
        <div className="card !p-3 !px-4">
          <p className="text-xs text-slate-400">Inventory Value</p>
          <p className="font-semibold text-lg">{formatBDT(stats.totalValue)}</p>
        </div>
        <button
          onClick={() => setStockFilter(stockFilter === "LOW" ? "ALL" : "LOW")}
          className={`card !p-3 !px-4 text-left transition-colors ${
            stockFilter === "LOW"
              ? "ring-2 ring-amber-300"
              : "hover:bg-slate-50"
          }`}
        >
          <p className="text-xs text-slate-400 flex items-center gap-1">
            {stats.lowStock > 0 && (
              <AlertTriangle size={12} className="text-amber-500" />
            )}{" "}
            Low Stock
          </p>
          <p className="font-semibold text-lg text-amber-600">
            {stats.lowStock}
          </p>
        </button>
        <button
          onClick={() => setStockFilter(stockFilter === "OUT" ? "ALL" : "OUT")}
          className={`card !p-3 !px-4 text-left transition-colors ${
            stockFilter === "OUT" ? "ring-2 ring-red-300" : "hover:bg-slate-50"
          }`}
        >
          <p className="text-xs text-slate-400">Out of Stock</p>
          <p className="font-semibold text-lg text-red-600">
            {stats.outOfStock}
          </p>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input !pl-9 w-full"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {categories.length > 0 && (
            <div className="relative sm:w-52">
              <select
                className="input w-full appearance-none pr-9"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          )}
          {stockFilter !== "ALL" && (
            <button
              onClick={() => setStockFilter("ALL")}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 self-start sm:self-center px-2"
            >
              <X size={12} /> Clear stock filter
            </button>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={exportExcel}
            className="btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={openNew}
            className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Desktop / tablet table */}
      <div className="card overflow-x-auto p-0 hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Image</th>
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Cost</th>
              <th className="p-3 font-medium">Est. Price</th>
              <th className="p-3 font-medium">Stock</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">
                  Loading products...
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-3">
                    <ProductThumb
                      src={p.image}
                      alt={p.watchName}
                      onClick={() =>
                        setLightbox({ src: p.image, title: p.watchName })
                      }
                    />
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-slate-800">{p.watchName}</p>
                    <p className="text-xs text-slate-400">{p.modelName}</p>
                  </td>
                  <td className="p-3 text-slate-500">{p.sku}</td>
                  <td className="p-3 text-slate-600">
                    {formatBDT(
                      (p.purchasePrice || 0) + (p.additionalCost || 0)
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {formatBDT(p.estSellingMin)}–{formatBDT(p.estSellingMax)}
                  </td>
                  <td className="p-3">
                    <span className={`badge ${stockBadge(p)}`}>
                      {p.quantity <= 0 ? "Out" : p.quantity}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`badge ${
                        p.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openRestock(p)}
                        className="text-emerald-600 text-xs font-medium hover:underline flex items-center gap-1"
                      >
                        <PackagePlus size={14} /> Restock
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="text-brand-600 text-xs font-medium hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 md:hidden">
        {loading && (
          <div className="card text-center text-slate-400 py-6 col-span-full">
            Loading products...
          </div>
        )}
        {!loading &&
          filtered.map((p) => (
            <div key={p._id} className="card !p-3 space-y-3">
              <div className="flex items-center gap-3">
                <ProductThumb
                  src={p.image}
                  alt={p.watchName}
                  size="w-14 h-14"
                  rounded="rounded-xl"
                  iconSize={20}
                  onClick={() =>
                    setLightbox({ src: p.image, title: p.watchName })
                  }
                />
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {p.watchName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {p.modelName}
                  </p>
                  <p className="text-xs text-slate-400">{p.sku}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {formatBDT((p.purchasePrice || 0) + (p.additionalCost || 0))}
                </span>
                <span className={`badge ${stockBadge(p)}`}>
                  {p.quantity <= 0 ? "Out" : `${p.quantity} in stock`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`badge ${
                    p.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {p.isActive ? "Active" : "Inactive"}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openRestock(p)}
                    className="text-emerald-600 font-medium hover:underline flex items-center gap-1"
                  >
                    <PackagePlus size={13} /> Restock
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="text-brand-600 font-medium hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        {!loading && filtered.length === 0 && (
          <div className="card text-center text-slate-400 py-6 col-span-full">
            No products found.
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {lightbox?.src && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <figure
            className="max-w-3xl w-full max-h-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.src}
              alt={lightbox.title}
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            {lightbox.title && (
              <figcaption className="text-white/90 text-sm mt-3">
                {lightbox.title}
              </figcaption>
            )}
          </figure>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Product" : "Add Product"}
        wide
      >
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex items-center gap-4">
            {form.image ? (
              <button
                type="button"
                onClick={() =>
                  setLightbox({ src: form.image, title: form.watchName })
                }
                className="rounded-xl ring-1 ring-slate-100 hover:ring-2 hover:ring-brand-300 transition-all"
              >
                <img
                  src={form.image}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              </button>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
                <ImageIcon />
              </div>
            )}
            <label className="btn-secondary cursor-pointer flex items-center gap-2 text-xs">
              <Upload size={14} /> {uploading ? "Uploading..." : "Upload Image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImage}
              />
            </label>
          </div>

          <div>
            <label className="label">Model Name</label>
            <input
              className="input"
              required
              value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Watch Name</label>
            <input
              className="input"
              required
              value={form.watchName}
              onChange={(e) => setForm({ ...form, watchName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Brand</label>
            <input
              className="input"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Purchase Price (৳)</label>
            <input
              type="number"
              className="input"
              value={form.purchasePrice}
              onChange={(e) =>
                setForm({ ...form, purchasePrice: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Additional Cost (৳)</label>
            <input
              type="number"
              className="input"
              value={form.additionalCost}
              onChange={(e) =>
                setForm({ ...form, additionalCost: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Est. Selling Min (৳)</label>
            <input
              type="number"
              className="input"
              value={form.estSellingMin}
              onChange={(e) =>
                setForm({ ...form, estSellingMin: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Est. Selling Max (৳)</label>
            <input
              type="number"
              className="input"
              value={form.estSellingMax}
              onChange={(e) =>
                setForm({ ...form, estSellingMax: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Minimum Stock</label>
            <input
              type="number"
              className="input"
              value={form.minimumStock}
              onChange={(e) =>
                setForm({ ...form, minimumStock: Number(e.target.value) })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        title={`Restock — ${restockProduct?.watchName || ""}`}
      >
        {restockProduct && (
          <form onSubmit={submitRestock} className="space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <ProductThumb
                src={restockProduct.image}
                alt={restockProduct.watchName}
                onClick={() =>
                  setLightbox({
                    src: restockProduct.image,
                    title: restockProduct.watchName,
                  })
                }
              />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {restockProduct.watchName}
                </p>
                <p className="text-xs text-slate-400">
                  {restockProduct.sku} · currently {restockProduct.quantity} in
                  stock
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity to Add</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  required
                  value={restockForm.quantity}
                  onChange={(e) =>
                    setRestockForm({ ...restockForm, quantity: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Location</label>
                <select
                  className="input"
                  value={restockForm.location}
                  onChange={(e) =>
                    setRestockForm({ ...restockForm, location: e.target.value })
                  }
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
                <label className="label">Purchase Price (৳)</label>
                <input
                  type="number"
                  className="input"
                  placeholder={`Default: ${restockProduct.purchasePrice}`}
                  value={restockForm.purchasePrice}
                  onChange={(e) =>
                    setRestockForm({
                      ...restockForm,
                      purchasePrice: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="label">Additional Cost (৳)</label>
                <input
                  type="number"
                  className="input"
                  placeholder={`Default: ${restockProduct.additionalCost}`}
                  value={restockForm.additionalCost}
                  onChange={(e) =>
                    setRestockForm({
                      ...restockForm,
                      additionalCost: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="label">Supplier (optional)</label>
              <input
                className="input"
                value={restockForm.supplier}
                onChange={(e) =>
                  setRestockForm({ ...restockForm, supplier: e.target.value })
                }
              />
            </div>

            {restockError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {restockError}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRestockOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                disabled={restocking}
              >
                <PackagePlus size={16} />{" "}
                {restocking
                  ? "Restocking..."
                  : `Add ${restockForm.quantity || 1} Unit(s)`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
