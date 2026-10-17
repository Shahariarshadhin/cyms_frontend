"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Upload,
  Download,
  ImageIcon,
  PackagePlus,
  PackageMinus,
  Package,
  PackageCheck,
  PackageX,
  Wallet,
  AlertTriangle,
  History,
  Pencil,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import { formatBDT } from "@/lib/auth";

const PAGE_SIZE = 20;

const emptyForm = {
  modelName: "",
  watchName: "",
  brand: "",
  category: "General",
  gender: "MEN",
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

const emptyReduce = {
  quantity: 1,
  reason: "DAMAGED",
  notes: "",
};

const REDUCE_REASONS = ["DAMAGED", "LOST", "RETURNED", "CANCELLED"];

const GENDER_OPTIONS = [
  { value: "MEN", label: "Men" },
  { value: "LADIES", label: "Ladies" },
];

const GENDER_TABS = [
  { value: "ALL", label: "All watches" },
  { value: "MEN", label: "Men" },
  { value: "LADIES", label: "Ladies" },
];

const SORTS = [
  { value: "NEW", label: "Newest first" },
  { value: "NAME", label: "Name A–Z" },
  { value: "STOCK_ASC", label: "Stock: low to high" },
  { value: "STOCK_DESC", label: "Stock: high to low" },
  { value: "PRICE_DESC", label: "Price: high to low" },
  { value: "MARGIN_DESC", label: "Margin: high to low" },
];

// ok = above reorder level, low = at or below it, out = nothing left
const STATE = {
  OK: { label: "Well stocked", color: "#10b981", text: "text-emerald-700" },
  LOW: { label: "Low stock", color: "#f59e0b", text: "text-amber-700" },
  OUT: { label: "Out of stock", color: "#f43f5e", text: "text-rose-700" },
};

const stockState = (p) =>
  p.quantity <= 0 ? "OUT" : p.quantity <= p.minimumStock ? "LOW" : "OK";

const unitCost = (p) => (p.purchasePrice || 0) + (p.additionalCost || 0);
const avgPrice = (p) => ((p.estSellingMin || 0) + (p.estSellingMax || 0)) / 2;
const marginOf = (p) => (avgPrice(p) > 0 ? avgPrice(p) - unitCost(p) : null);
const marginPctOf = (p) => {
  const m = marginOf(p);
  return m === null || avgPrice(p) === 0 ? null : Math.round((m / avgPrice(p)) * 100);
};
const signedBDT = (n) => `${n >= 0 ? "+" : "−"}${formatBDT(Math.abs(n))}`;

// Builds a compact page list like [1, "...", 4, 5, 6, "...", 12]
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => pages.add(n));
  if (current >= total - 2)
    [total - 1, total - 2, total - 3].forEach((n) => pages.add(n));
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("...");
    out.push(n);
  });
  return out;
}

/**
 * Stock dial: a watch-face ring that fills with quantity.
 * Full ring = 3x the reorder level. The small tick marks the reorder level.
 */
function StockDial({ p, size = 40 }) {
  const state = stockState(p);
  const color = STATE[state].color;
  const min = p.minimumStock || 0;
  const cap = Math.max(min * 3, 1);
  const pct = p.quantity <= 0 ? 0 : Math.min(p.quantity / cap, 1);
  const R = 15.5;
  const C = 2 * Math.PI * R;
  // tick at 1/3 of the ring (the reorder level), measured clockwise from 12 o'clock
  const a = (-90 + 120) * (Math.PI / 180);
  const tick = {
    x1: 18 + 12.6 * Math.cos(a),
    y1: 18 + 12.6 * Math.sin(a),
    x2: 18 + 18.2 * Math.cos(a),
    y2: 18 + 18.2 * Math.sin(a),
  };
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title={`${p.quantity} in stock (reorder at ${min})`}
    >
      <svg viewBox="0 0 36 36" width={size} height={size}>
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${pct * C} ${C}`}
          transform="rotate(-90 18 18)"
        />
        {min > 0 && (
          <line
            {...tick}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeLinecap="round"
          />
        )}
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold text-slate-800 tabular-nums"
        style={{ fontSize: Math.max(10, size * 0.3) }}
      >
        {Math.max(p.quantity, 0)}
      </span>
    </div>
  );
}

function GenderBadge({ gender, solid }) {
  const ladies = gender === "LADIES";
  const tone = solid
    ? `bg-white/90 backdrop-blur shadow-sm ${ladies ? "text-pink-700" : "text-sky-700"}`
    : ladies
      ? "bg-pink-50 text-pink-700"
      : "bg-sky-50 text-sky-700";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${tone}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${ladies ? "bg-pink-500" : "bg-sky-500"}`}
      />
      {ladies ? "Ladies" : "Men"}
    </span>
  );
}

function IconAction({ onClick, title, disabled, tone, children }) {
  const tones = {
    emerald: "text-emerald-600 hover:bg-emerald-50",
    red: "text-red-600 hover:bg-red-50",
    blue: "text-blue-600 hover:bg-blue-50",
    slate: "text-slate-500 hover:bg-slate-100",
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

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
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`${size} ${rounded} overflow-hidden shrink-0 ring-1 ring-slate-200 hover:ring-2 hover:ring-brand-300 transition-all focus:outline-none focus:ring-2 focus:ring-brand-400`}
      title="View larger image"
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </button>
  );
}

function StatCard({ icon: Icon, tone, label, value, hint, active, onClick }) {
  const tones = {
    violet: { tile: "bg-violet-50 text-violet-600", ring: "ring-violet-300" },
    sky: { tile: "bg-sky-50 text-sky-600", ring: "ring-sky-300" },
    emerald: { tile: "bg-emerald-50 text-emerald-600", ring: "ring-emerald-300" },
    amber: { tile: "bg-amber-50 text-amber-600", ring: "ring-amber-300" },
    red: { tile: "bg-red-50 text-red-600", ring: "ring-red-300" },
  };
  const t = tones[tone];
  const body = (
    <>
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.tile}`}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-800 tabular-nums truncate">
          {value}
        </p>
        {hint && <p className="text-[11px] text-slate-400 truncate">{hint}</p>}
      </div>
    </>
  );
  const base = "card !p-3.5 sm:!p-4 flex items-center gap-3 transition-all";
  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={`${base} text-left hover:shadow-md ${
        active ? `ring-2 ${t.ring}` : ""
      }`}
    >
      {body}
    </button>
  );
}

function Chip({ children, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full pl-2.5 pr-1 py-1">
      {children}
      <button
        type="button"
        onClick={onClear}
        aria-label="Remove filter"
        className="p-0.5 rounded-full hover:bg-slate-200"
      >
        <X size={12} />
      </button>
    </span>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL"); // ALL | MEN | LADIES
  const [stockFilter, setStockFilter] = useState("ALL"); // ALL | OK | LOW | OUT
  const [sortBy, setSortBy] = useState("NEW");
  const [view, setView] = useState("list"); // grid | list
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);

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

  const [reduceOpen, setReduceOpen] = useState(false);
  const [reduceProduct, setReduceProduct] = useState(null);
  const [reduceForm, setReduceForm] = useState(emptyReduce);
  const [reducing, setReducing] = useState(false);
  const [reduceError, setReduceError] = useState("");

  const [lightbox, setLightbox] = useState(null); // { src, title } | null

  // Cost History modal state
  const [historyFor, setHistoryFor] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const searchRef = useRef(null);

  const openHistory = async (product) => {
    setHistoryFor(product);
    setHistoryData(null);
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/inventory/history/${product._id}`);
      setHistoryData(data);
    } catch (err) {
      setHistoryError(
        err?.response?.data?.message || "Failed to load cost history",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load everything once. Search, filters, sorting and paging all run in the
  // browser, so they feel instant and the counts always cover the full list.
  const load = async () => {
    try {
      const { data } = await api.get("/products", { params: { limit: 1000 } });
      setProducts(data.products);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Remember grid / list choice
  useEffect(() => {
    try {
      const v = localStorage.getItem("products:view");
      if (v === "grid" || v === "list") setView(v);
    } catch {}
  }, []);
  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem("products:view", v);
    } catch {}
  };

  // Back to page 1 whenever the result set changes
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, genderFilter, stockFilter, sortBy]);

  // Escape closes lightbox, then the detail panel. "/" jumps to search.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(null);
        else if (detailId) setDetailId(null);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const el = document.activeElement;
        const typing =
          el &&
          (/^(input|textarea|select)$/i.test(el.tagName) ||
            el.isContentEditable);
        if (!typing) {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, detailId]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.category).filter(Boolean)),
      ).sort(),
    [products],
  );

  const genderCounts = useMemo(() => {
    const counts = { ALL: products.length, MEN: 0, LADIES: 0 };
    products.forEach((p) => {
      if (p.gender === "LADIES") counts.LADIES += 1;
      else counts.MEN += 1;
    });
    return counts;
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesSearch =
        !q ||
        [p.watchName, p.modelName, p.sku, p.brand].some((v) =>
          (v || "").toLowerCase().includes(q),
        );
      const matchesCategory =
        categoryFilter === "ALL" || p.category === categoryFilter;
      const matchesGender =
        genderFilter === "ALL" || (p.gender || "MEN") === genderFilter;
      const matchesStock =
        stockFilter === "ALL" || stockState(p) === stockFilter;
      return matchesSearch && matchesCategory && matchesGender && matchesStock;
    });

    const sorted = [...list];
    switch (sortBy) {
      case "NAME":
        sorted.sort((a, b) => (a.watchName || "").localeCompare(b.watchName || ""));
        break;
      case "STOCK_ASC":
        sorted.sort((a, b) => a.quantity - b.quantity);
        break;
      case "STOCK_DESC":
        sorted.sort((a, b) => b.quantity - a.quantity);
        break;
      case "PRICE_DESC":
        sorted.sort((a, b) => avgPrice(b) - avgPrice(a));
        break;
      case "MARGIN_DESC":
        sorted.sort(
          (a, b) => (marginOf(b) ?? -Infinity) - (marginOf(a) ?? -Infinity),
        );
        break;
      default:
        break; // API already returns newest first
    }
    return sorted;
  }, [products, search, categoryFilter, genderFilter, stockFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = useMemo(
    () => filtered.slice(pageStart, pageStart + PAGE_SIZE),
    [filtered, pageStart],
  );

  const goToPage = (n) => {
    setPage(n);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const stats = useMemo(() => {
    let value = 0;
    let units = 0;
    let ok = 0;
    let low = 0;
    let out = 0;
    products.forEach((p) => {
      const q = Math.max(p.quantity || 0, 0);
      value += unitCost(p) * q;
      units += q;
      const s = stockState(p);
      if (s === "OK") ok += 1;
      else if (s === "LOW") low += 1;
      else out += 1;
    });
    return { total: products.length, value, units, ok, low, out };
  }, [products]);

  const detail = useMemo(
    () => products.find((p) => p._id === detailId) || null,
    [products, detailId],
  );

  const hasActiveFilters =
    stockFilter !== "ALL" ||
    genderFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    search.trim() !== "";

  const clearFilters = () => {
    setStockFilter("ALL");
    setGenderFilter("ALL");
    setCategoryFilter("ALL");
    setSearch("");
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...emptyForm, ...p, gender: p.gender || "MEN" });
    setModalOpen(true);
  };
  const openRestock = (p) => {
    setRestockProduct(p);
    setRestockForm(emptyRestock);
    setRestockError("");
    setRestockOpen(true);
  };
  const openReduce = (p) => {
    setReduceProduct(p);
    setReduceForm(emptyReduce);
    setReduceError("");
    setReduceOpen(true);
  };

  // From the detail panel: close it first, then open the chosen dialog
  const fromPanel = (fn, p) => {
    setDetailId(null);
    fn(p);
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
        err?.response?.data?.message || "Failed to restock product",
      );
    } finally {
      setRestocking(false);
    }
  };

  const submitReduce = async (e) => {
    e.preventDefault();
    setReduceError("");
    setReducing(true);
    try {
      await api.post("/inventory/decrease", {
        productId: reduceProduct._id,
        quantity: Number(reduceForm.quantity) || 1,
        reason: reduceForm.reason,
        notes: reduceForm.notes,
      });
      setReduceOpen(false);
      load();
    } catch (err) {
      setReduceError(err?.response?.data?.message || "Failed to reduce stock");
    } finally {
      setReducing(false);
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
      "_blank",
    );
  };

  const rangeFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const rangeTo = Math.min(pageStart + PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes panel-in { from { transform: translateX(28px); opacity: 0 } to { transform: none; opacity: 1 } }
        .panel-in { animation: panel-in .22s ease-out }
        @media (prefers-reduced-motion: reduce) { .panel-in { animation: none } }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading
              ? "Loading your catalogue..."
              : `${stats.total} products, ${stats.units} units on hand`}
          </p>
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
            className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center shadow-sm"
          >
            <Plus size={16} /> Add product
          </button>
        </div>
      </div>

      {/* Summary cards (the three stock cards also work as filters) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          icon={Package}
          tone="violet"
          label="Total products"
          value={stats.total}
          hint={`${stats.units} units on hand`}
        />
        <StatCard
          icon={Wallet}
          tone="sky"
          label="Inventory value"
          value={formatBDT(stats.value)}
          hint="At cost price"
        />
        <StatCard
          icon={PackageCheck}
          tone="emerald"
          label="Well stocked"
          value={stats.ok}
          hint="Above reorder level"
          active={stockFilter === "OK"}
          onClick={() => setStockFilter(stockFilter === "OK" ? "ALL" : "OK")}
        />
        <StatCard
          icon={AlertTriangle}
          tone="amber"
          label="Low stock"
          value={stats.low}
          hint="At or below reorder level"
          active={stockFilter === "LOW"}
          onClick={() => setStockFilter(stockFilter === "LOW" ? "ALL" : "LOW")}
        />
        <StatCard
          icon={PackageX}
          tone="red"
          label="Out of stock"
          value={stats.out}
          hint="Needs restocking"
          active={stockFilter === "OUT"}
          onClick={() => setStockFilter(stockFilter === "OUT" ? "ALL" : "OUT")}
        />
      </div>

      {/* Toolbar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex bg-slate-100 rounded-xl p-1 overflow-x-auto">
            {GENDER_TABS.map((t) => {
              const active = genderFilter === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setGenderFilter(t.value)}
                  className={`px-3 sm:px-4 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    active
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                  <span className="text-[11px] tabular-nums text-slate-400">
                    {genderCounts[t.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:inline-flex bg-slate-100 rounded-xl p-1">
            {[
              { v: "grid", Icon: LayoutGrid, label: "Gallery view" },
              { v: "list", Icon: List, label: "Table view" },
            ].map(({ v, Icon, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => changeView(v)}
                title={label}
                aria-label={label}
                aria-pressed={view === v}
                className={`p-2 rounded-lg transition-all ${
                  view === v
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={searchRef}
              className="input !pl-9 !pr-10 w-full"
              placeholder="Search by name, model, SKU or brand"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50">
                /
              </kbd>
            )}
          </div>

          {categories.length > 0 && (
            <div className="relative sm:w-48">
              <select
                className="input w-full appearance-none pr-9"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Category"
              >
                <option value="ALL">All categories</option>
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

          <div className="relative sm:w-52">
            <select
              className="input w-full appearance-none pr-9"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
          <span className="text-xs text-slate-500 mr-1">
            {loading
              ? "Loading..."
              : `Showing ${rangeFrom}–${rangeTo} of ${filtered.length}`}
          </span>
          {stockFilter !== "ALL" && (
            <Chip onClear={() => setStockFilter("ALL")}>
              {STATE[stockFilter].label}
            </Chip>
          )}
          {categoryFilter !== "ALL" && (
            <Chip onClear={() => setCategoryFilter("ALL")}>{categoryFilter}</Chip>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 underline underline-offset-2"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* Table view (desktop only) */}
      {view === "list" && (
        <div className="card overflow-hidden p-0 hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-600 bg-slate-100/80 border-b border-slate-200 [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wider">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium">Selling range</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4" colSpan={6}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100" />
                          <div className="space-y-2 flex-1">
                            <div className="h-3 w-1/3 bg-slate-100 rounded" />
                            <div className="h-3 w-1/4 bg-slate-100 rounded" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading &&
                  paged.map((p) => {
                    const m = marginOf(p);
                    const s = stockState(p);
                    return (
                      <tr
                        key={p._id}
                        tabIndex={0}
                        onClick={() => setDetailId(p._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setDetailId(p._id);
                        }}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors focus:outline-none focus-visible:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-[230px]">
                            <ProductThumb
                              src={p.image}
                              alt={p.watchName}
                              size="w-12 h-12"
                              rounded="rounded-xl"
                              iconSize={18}
                              onClick={() =>
                                setLightbox({ src: p.image, title: p.watchName })
                              }
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate">
                                {p.watchName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-400 truncate">
                                  {p.modelName}
                                </span>
                                <GenderBadge gender={p.gender} />
                                {!p.isActive && (
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium tabular-nums">
                          {formatBDT(unitCost(p))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                          <p className="text-slate-700">
                            {formatBDT(p.estSellingMin)}–{formatBDT(p.estSellingMax)}
                          </p>
                          {m !== null && (
                            <p
                              className={`text-xs ${
                                m >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {signedBDT(m)} margin
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <StockDial p={p} size={38} />
                            <span className={`text-xs font-medium ${STATE[s].text}`}>
                              {STATE[s].label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <IconAction
                              title="Restock"
                              tone="emerald"
                              onClick={() => openRestock(p)}
                            >
                              <PackagePlus size={16} />
                            </IconAction>
                            <IconAction
                              title="Reduce stock"
                              tone="red"
                              disabled={p.quantity <= 0}
                              onClick={() => openReduce(p)}
                            >
                              <PackageMinus size={16} />
                            </IconAction>
                            <IconAction
                              title="Cost history"
                              tone="blue"
                              onClick={() => openHistory(p)}
                            >
                              <History size={16} />
                            </IconAction>
                            <IconAction
                              title="Edit product"
                              tone="slate"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil size={16} />
                            </IconAction>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        hasFilters={hasActiveFilters}
                        onClear={clearFilters}
                        onAdd={openNew}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gallery view (always on mobile) */}
      <div
        className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 ${
          view === "list" ? "md:hidden" : ""
        }`}
      >
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card !p-0 overflow-hidden animate-pulse">
              <div className="aspect-square bg-slate-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-2/3 bg-slate-100 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
          ))}

        {!loading &&
          paged.map((p) => {
            const m = marginOf(p);
            return (
              <article
                key={p._id}
                tabIndex={0}
                onClick={() => setDetailId(p._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setDetailId(p._id);
                }}
                className="card !p-0 overflow-hidden cursor-pointer flex flex-col hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <div className="relative aspect-square bg-slate-100">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.watchName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <GenderBadge gender={p.gender} solid />
                  </div>
                  {!p.isActive && (
                    <span className="absolute top-2 right-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-white">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col gap-2.5">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {p.watchName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {p.brand || p.modelName}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-2 mt-auto">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 tabular-nums truncate">
                        {formatBDT(p.estSellingMin)}
                        {p.estSellingMax > p.estSellingMin &&
                          `–${formatBDT(p.estSellingMax)}`}
                      </p>
                      <p className="text-[11px] text-slate-400 tabular-nums truncate">
                        Cost {formatBDT(unitCost(p))}
                        {m !== null && (
                          <span
                            className={m >= 0 ? " text-emerald-600" : " text-rose-600"}
                          >
                            {" "}
                            {signedBDT(m)}
                          </span>
                        )}
                      </p>
                    </div>
                    <StockDial p={p} size={42} />
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t border-slate-100 divide-x divide-slate-100 text-xs font-medium">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRestock(p);
                    }}
                    className="py-2.5 flex items-center justify-center gap-1.5 text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <PackagePlus size={14} /> Restock
                  </button>
                  <button
                    type="button"
                    disabled={p.quantity <= 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      openReduce(p);
                    }}
                    className="py-2.5 flex items-center justify-center gap-1.5 text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <PackageMinus size={14} /> Reduce
                  </button>
                </div>
              </article>
            );
          })}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full card">
            <EmptyState
              hasFilters={hasActiveFilters}
              onClear={clearFilters}
              onAdd={openNew}
            />
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="card !p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Page <b className="text-slate-700">{currentPage}</b> of{" "}
            <b className="text-slate-700">{totalPages}</b>
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {getPageNumbers(currentPage, totalPages).map((n, i) =>
              n === "..." ? (
                <span key={`dots-${i}`} className="w-9 text-center text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => goToPage(n)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium tabular-nums transition-colors ${
                    n === currentPage
                      ? "bg-slate-800 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Product detail panel */}
      {detail && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDetailId(null)}
          />
          <aside className="panel-in absolute right-0 top-0 h-full w-full sm:w-[440px] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Product details</h2>
              <button
                onClick={() => setDetailId(null)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="aspect-[4/3] bg-slate-100">
                {detail.image ? (
                  <button
                    type="button"
                    className="w-full h-full"
                    onClick={() =>
                      setLightbox({ src: detail.image, title: detail.watchName })
                    }
                    title="View larger image"
                  >
                    <img
                      src={detail.image}
                      alt={detail.watchName}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon size={40} />
                  </div>
                )}
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">
                    {detail.watchName}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {[detail.brand, detail.modelName]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <GenderBadge gender={detail.gender} />
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {detail.category || "General"}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        detail.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {detail.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {detail.sku}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                  <StockDial p={detail} size={68} />
                  <div>
                    <p
                      className={`font-semibold ${STATE[stockState(detail)].text}`}
                    >
                      {STATE[stockState(detail)].label}
                    </p>
                    <p className="text-sm text-slate-500">
                      {Math.max(detail.quantity, 0)} units on hand
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Reorder level is {detail.minimumStock}
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Purchase price</dt>
                    <dd className="font-medium text-slate-800 tabular-nums">
                      {formatBDT(detail.purchasePrice || 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Additional cost</dt>
                    <dd className="font-medium text-slate-800 tabular-nums">
                      {formatBDT(detail.additionalCost || 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Total cost per unit</dt>
                    <dd className="font-semibold text-slate-800 tabular-nums">
                      {formatBDT(unitCost(detail))}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Selling range</dt>
                    <dd className="font-medium text-slate-800 tabular-nums">
                      {formatBDT(detail.estSellingMin)}–
                      {formatBDT(detail.estSellingMax)}
                    </dd>
                  </div>
                  {marginOf(detail) !== null && (
                    <div className="flex justify-between py-2.5">
                      <dt className="text-slate-500">Estimated margin</dt>
                      <dd
                        className={`font-semibold tabular-nums ${
                          marginOf(detail) >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {signedBDT(marginOf(detail))} ({marginPctOf(detail)}%)
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Stock value at cost</dt>
                    <dd className="font-medium text-slate-800 tabular-nums">
                      {formatBDT(unitCost(detail) * Math.max(detail.quantity, 0))}
                    </dd>
                  </div>
                </dl>

                {detail.description && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {detail.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => fromPanel(openRestock, detail)}
                className="h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <PackagePlus size={16} /> Restock
              </button>
              <button
                type="button"
                disabled={detail.quantity <= 0}
                onClick={() => fromPanel(openReduce, detail)}
                className="h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PackageMinus size={16} /> Reduce
              </button>
              <button
                type="button"
                onClick={() => fromPanel(openHistory, detail)}
                className="h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <History size={16} /> Cost history
              </button>
              <button
                type="button"
                onClick={() => fromPanel(openEdit, detail)}
                className="h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Pencil size={16} /> Edit
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Image lightbox */}
      {lightbox?.src && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/80 flex items-center justify-center p-4 sm:p-8"
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
            <label className="label">For</label>
            <select
              className="input"
              required
              value={form.gender || "MEN"}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
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

      <Modal
        open={reduceOpen}
        onClose={() => setReduceOpen(false)}
        title={`Reduce Stock — ${reduceProduct?.watchName || ""}`}
      >
        {reduceProduct && (
          <form onSubmit={submitReduce} className="space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <ProductThumb
                src={reduceProduct.image}
                alt={reduceProduct.watchName}
                onClick={() =>
                  setLightbox({
                    src: reduceProduct.image,
                    title: reduceProduct.watchName,
                  })
                }
              />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {reduceProduct.watchName}
                </p>
                <p className="text-xs text-slate-400">
                  {reduceProduct.sku} · currently {reduceProduct.quantity} in
                  stock
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity to Remove</label>
                <input
                  type="number"
                  min="1"
                  max={reduceProduct.quantity}
                  className="input"
                  required
                  value={reduceForm.quantity}
                  onChange={(e) =>
                    setReduceForm({ ...reduceForm, quantity: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Reason</label>
                <select
                  className="input"
                  value={reduceForm.reason}
                  onChange={(e) =>
                    setReduceForm({ ...reduceForm, reason: e.target.value })
                  }
                >
                  {REDUCE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0) + r.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <input
                className="input"
                placeholder="e.g. broken during shipping"
                value={reduceForm.notes}
                onChange={(e) =>
                  setReduceForm({ ...reduceForm, notes: e.target.value })
                }
              />
            </div>

            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              This marks the oldest {reduceForm.quantity || 1} in-stock unit(s)
              as {reduceForm.reason.toLowerCase()} and removes them from
              available stock. It won't affect units already sold or reserved.
            </p>

            {reduceError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {reduceError}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setReduceOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2"
                disabled={reducing}
              >
                <PackageMinus size={16} />{" "}
                {reducing
                  ? "Reducing..."
                  : `Remove ${reduceForm.quantity || 1} Unit(s)`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cost History Modal */}
      {historyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">
                Cost History — {historyFor.watchName}
              </h3>
              <button
                onClick={() => {
                  setHistoryFor(null);
                  setHistoryData(null);
                  setHistoryError("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {historyLoading && (
                <p className="text-sm text-slate-400">Loading...</p>
              )}

              {historyError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {historyError}
                </p>
              )}

              {!historyLoading &&
                historyData?.batches?.length > 0 &&
                [...historyData.batches].reverse().map((b, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 ${
                        isLatest
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-100"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-slate-700">
                          {isLatest ? "Latest purchase" : "Previous purchase"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(b.purchaseDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <div>
                          Purchase price:{" "}
                          <b className="text-slate-800">
                            {formatBDT(b.purchasePrice)}
                          </b>
                        </div>
                        <div>
                          Additional cost:{" "}
                          <b className="text-slate-800">
                            {formatBDT(b.additionalCost)}
                          </b>
                        </div>
                        <div>
                          Total cost/unit:{" "}
                          <b className="text-slate-800">
                            {formatBDT(b.totalCost)}
                          </b>
                        </div>
                        <div>Supplier: {b.supplier || "—"}</div>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-slate-400">
                        <span>Bought: {b.quantityBought}</span>
                        <span>In stock: {b.quantityInStock}</span>
                        <span>Sold: {b.quantitySold}</span>
                        {b.quantityOther > 0 && (
                          <span>Other: {b.quantityOther}</span>
                        )}
                      </div>
                    </div>
                  );
                })}

              {!historyLoading &&
                !historyError &&
                historyData?.batches?.length === 0 && (
                  <p className="text-sm text-slate-400">
                    No purchase history yet.
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasFilters, onClear, onAdd }) {
  return (
    <div className="py-14 text-center px-4">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <Package size={22} />
      </div>
      {hasFilters ? (
        <>
          <p className="font-medium text-slate-700">
            No products match these filters
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try a different search, or remove a filter.
          </p>
          <button
            onClick={onClear}
            className="btn-secondary mt-4 text-xs"
            type="button"
          >
            Clear all filters
          </button>
        </>
      ) : (
        <>
          <p className="font-medium text-slate-700">No products yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Add your first watch to start tracking stock.
          </p>
          <button onClick={onAdd} className="btn-primary mt-4 text-xs" type="button">
            Add product
          </button>
        </>
      )}
    </div>
  );
}