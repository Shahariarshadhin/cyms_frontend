"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const TABS = [
  { key: "RESEARCHING", label: "Expected Buying List" },
  { key: "PURCHASED", label: "Purchase Done" },
];

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
    new Date().toISOString().slice(0, 10),
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
        {/* Segmented control with a sliding highlight */}
        <div className="relative flex bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative z-10 px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === t.key && (
                <motion.span
                  layoutId="research-tab-pill"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  className="absolute inset-0 bg-brand-600 rounded-lg -z-10"
                />
              )}
              {t.label}
            </button>
          ))}
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
        <div className="card text-center py-16 text-slate-400">
          <p className="font-medium text-slate-500">
            {tab === "RESEARCHING"
              ? "The research list is empty"
              : "Nothing purchased yet"}
          </p>
          <p className="text-sm mt-1">
            {tab === "RESEARCHING"
              ? "Add a watch you're considering to start tracking it."
              : "Items move here once you mark them Purchased."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-stretch">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.div
              key={item._id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
              className="group relative flex flex-col h-full rounded-2xl border border-slate-200/80 bg-[#fbfaf8] overflow-hidden transition-shadow duration-300 hover:shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)]"
            >
              {/* Photo, framed like a catalog specimen with a lot number */}
              <div className="relative p-3 pb-0">
                <button
                  type="button"
                  className="relative block w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-100"
                  onClick={() =>
                    item.image &&
                    setImageModal({ src: item.image, alt: item.productName })
                  }
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={30} />
                    </div>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <span className="absolute top-5 left-5 font-mono text-[10px] tracking-wide bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                  No. {String(index + 1).padStart(3, "0")}
                </span>

                {item.status === "PURCHASED" && (
                  <div className="absolute top-6 -right-9 rotate-45 z-10">
                    <div className="w-36 text-center bg-emerald-600 text-white text-[10px] font-semibold tracking-wider py-1 shadow-sm">
                      PURCHASED
                    </div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-4 pt-3 flex flex-col gap-1 flex-1">
                <h3 className="font-serif text-[15px] leading-snug text-slate-900 line-clamp-2">
                  {item.productName}
                </h3>

                <div className="flex items-baseline gap-1">
                  <span className="text-amber-700 font-medium text-sm">
                    Est. {formatBDT(item.marketPriceMin)} –{" "}
                    {formatBDT(item.marketPriceMax)}
                  </span>
                </div>

                <div className="">
                  {item.status === "PURCHASED" &&
                    item.purchasedPrice != null && (
                      <p className="text-sm text-emerald-700">
                        Bought at {formatBDT(item.purchasedPrice)}
                        {item.purchasedDate
                          ? ` · ${new Date(item.purchasedDate).toLocaleDateString()}`
                          : ""}
                      </p>
                    )}
                </div>

                <div className="">
                  {item.sourceLink && (
                    <a
                      href={item.sourceLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700 bg-slate-100 hover:bg-brand-50 rounded-full px-2 py-1 transition-colors w-fit"
                    >
                      <ExternalLink size={11} /> Source
                    </a>
                  )}
                </div>

                <div className="min-h-[2.25rem]">
                  {item.notes && (
                    <p className="font-serif italic text-xs text-slate-400 line-clamp-2">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Footer stays pinned to the bottom via mt-auto */}
                <div className="mt-auto pt-3 flex items-center gap-2 border-t border-slate-200/70">
                  {item.status === "RESEARCHING" ? (
                    <>
                      <button
                        onClick={() => openPurchase(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium py-2 transition-colors"
                      >
                        <CheckCircle2 size={14} /> Mark Purchased
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        title="Edit"
                        className="p-2 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => revert(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium py-2 transition-colors"
                    >
                      <RotateCcw size={13} /> Move Back
                    </button>
                  )}
                  <button
                    onClick={() => remove(item)}
                    title="Delete"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
                        purchaseItem.marketPriceMin,
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
      <AnimatePresence>
        {imageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 sm:p-8"
            onClick={() => setImageModal(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/80 hover:text-white"
              onClick={() => setImageModal(null)}
            >
              <X size={28} />
            </button>
            <motion.figure
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="flex flex-col items-center gap-3 max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageModal.src}
                alt={imageModal.alt}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
              <figcaption className="font-serif text-white/90 text-sm">
                {imageModal.alt}
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
