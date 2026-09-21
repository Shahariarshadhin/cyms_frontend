"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Upload,
  ImageIcon,
  CheckCircle2,
  Pencil,
  Trash2,
  RotateCcw,
  ExternalLink,
  X,
} from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import { formatBDT } from "@/lib/auth";

const emptyForm = {
  productName: "",
  image: "",
  imagePublicId: "",
  marketPriceMin: "",
  marketPriceMax: "",
  sourceLink: "",
  notes: "",
};

export default function ResearchPage() {
  const [tab, setTab] = useState("RESEARCHING"); // RESEARCHING | PURCHASED
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [purchaseItem, setPurchaseItem] = useState(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [purchasing, setPurchasing] = useState(false);

  const [imageModal, setImageModal] = useState(null); // { src, alt }

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/research-products", {
        params: { status: tab, search: search || undefined },
      });
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [tab, search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      productName: item.productName,
      image: item.image,
      imagePublicId: item.imagePublicId,
      marketPriceMin: item.marketPriceMin,
      marketPriceMax: item.marketPriceMax,
      sourceLink: item.sourceLink || "",
      notes: item.notes || "",
    });
    setError("");
    setModalOpen(true);
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
    setError("");
    setSaving(true);
    try {
      if (editing) await api.put(`/research-products/${editing._id}`, form);
      else await api.post("/research-products", form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const openPurchase = (item) => {
    setPurchaseItem(item);
    setPurchasePrice("");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
  };

  const confirmPurchase = async () => {
    setPurchasing(true);
    try {
      await api.post(`/research-products/${purchaseItem._id}/purchase`, {
        purchasedPrice: purchasePrice || undefined,
        purchasedDate: purchaseDate,
      });
      setPurchaseItem(null);
      load();
    } finally {
      setPurchasing(false);
    }
  };

  const revert = async (item) => {
    if (!confirm(`Move "${item.productName}" back to the research list?`))
      return;
    await api.post(`/research-products/${item._id}/revert`);
    load();
  };

  const remove = async (item) => {
    if (!confirm(`Delete "${item.productName}" from the research list?`))
      return;
    await api.delete(`/research-products/${item._id}`);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("RESEARCHING")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
              tab === "RESEARCHING"
                ? "bg-brand-600 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Expected Buying List
          </button>
          <button
            onClick={() => setTab("PURCHASED")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
              tab === "PURCHASED"
                ? "bg-brand-600 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Purchase Done
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input pl-9"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {tab === "RESEARCHING" && (
            <button
              onClick={openNew}
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      {loading && <div className="text-slate-400 text-sm">Loading...</div>}

      {!loading && items.length === 0 && (
        <div className="card text-center py-12 text-slate-400">
          {tab === "RESEARCHING"
            ? "No products in the research list yet. Add one to get started."
            : "No purchases recorded yet."}
        </div>
      )}

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item._id}
            className="card !p-0 overflow-hidden flex flex-col"
          >
            <button
              type="button"
              className="relative w-full aspect-square bg-slate-100 group"
              onClick={() =>
                item.image &&
                setImageModal({ src: item.image, alt: item.productName })
              }
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.productName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon size={32} />
                </div>
              )}
              {item.status === "PURCHASED" && (
                <span className="absolute top-2 left-2 badge bg-emerald-600 text-white flex items-center gap-1">
                  <CheckCircle2 size={12} /> Purchased
                </span>
              )}
            </button>

            <div className="p-4 flex flex-col gap-2 flex-1">
              <p className="font-medium text-slate-800 leading-snug">
                {item.productName}
              </p>
              <p className="text-sm text-slate-500">
                Market Price:{" "}
                <span className="font-medium text-slate-700">
                  {formatBDT(item.marketPriceMin)} –{" "}
                  {formatBDT(item.marketPriceMax)}
                </span>
              </p>
              {item.status === "PURCHASED" && item.purchasedPrice != null && (
                <p className="text-sm text-emerald-700">
                  Bought at {formatBDT(item.purchasedPrice)}
                  {item.purchasedDate
                    ? ` on ${new Date(item.purchasedDate).toLocaleDateString()}`
                    : ""}
                </p>
              )}
              {item.sourceLink && (
                <a
                  href={item.sourceLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1 w-fit"
                >
                  <ExternalLink size={12} /> Source
                </a>
              )}
              {item.notes && (
                <p className="text-xs text-slate-400 line-clamp-2">
                  {item.notes}
                </p>
              )}

              <div className="mt-auto pt-2 flex flex-wrap items-center gap-3 border-t border-slate-50">
                {item.status === "RESEARCHING" ? (
                  <>
                    <button
                      onClick={() => openPurchase(item)}
                      className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <CheckCircle2 size={14} /> Purchase Done
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs font-medium text-brand-600 hover:underline flex items-center gap-1"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => revert(item)}
                    className="text-xs font-medium text-slate-500 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw size={13} /> Move Back
                  </button>
                )}
                <button
                  onClick={() => remove(item)}
                  className="text-xs font-medium text-red-500 hover:underline flex items-center gap-1 ml-auto"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Product" : "Add Product to Research List"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-4">
            {form.image ? (
              <img
                src={form.image}
                className="w-16 h-16 rounded-xl object-cover"
              />
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
            <label className="label">Product Name</label>
            <input
              className="input"
              required
              value={form.productName}
              onChange={(e) =>
                setForm({ ...form, productName: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Market Price Min (৳)</label>
              <input
                type="number"
                className="input"
                value={form.marketPriceMin}
                onChange={(e) =>
                  setForm({ ...form, marketPriceMin: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Market Price Max (৳)</label>
              <input
                type="number"
                className="input"
                value={form.marketPriceMax}
                onChange={(e) =>
                  setForm({ ...form, marketPriceMax: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="label">Source Link (optional)</label>
            <input
              className="input"
              value={form.sourceLink}
              onChange={(e) => setForm({ ...form, sourceLink: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add to List"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Purchase Done confirmation */}
      <Modal
        open={!!purchaseItem}
        onClose={() => setPurchaseItem(null)}
        title={`Purchase Done — ${purchaseItem?.productName || ""}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            This will move the product to the{" "}
            <span className="font-medium text-slate-700">Purchase Done</span>{" "}
            list. Optionally record the actual price you paid.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchased Price (৳)</label>
              <input
                type="number"
                className="input"
                placeholder={
                  purchaseItem
                    ? `Market: ${formatBDT(
                        purchaseItem.marketPriceMin
                      )}–${formatBDT(purchaseItem.marketPriceMax)}`
                    : ""
                }
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Purchase Date</label>
              <input
                type="date"
                className="input"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              className="btn-secondary"
              onClick={() => setPurchaseItem(null)}
            >
              Cancel
            </button>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={confirmPurchase}
              disabled={purchasing}
            >
              <CheckCircle2 size={16} />{" "}
              {purchasing ? "Saving..." : "Confirm Purchase"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Large image preview */}
      {imageModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setImageModal(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setImageModal(null)}
          >
            <X size={28} />
          </button>
          <img
            src={imageModal.src}
            alt={imageModal.alt}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
