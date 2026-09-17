"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import { formatBDT } from "@/lib/auth";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const emptyForm = {
  date: "",
  month: "",
  amountUSD: "",
  amountBDT: "",
  productName: "",
  note: "",
};

function formatUSD(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function BoostingCostPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ endorsedBDT: 0, usedBDT: 0, usedUSD: 0, remainingBDT: 0, count: 0 });

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/boosting-cost", {
        params: {
          page,
          limit: pageSize,
          month: monthFilter !== "ALL" ? monthFilter : undefined,
          search: search || undefined,
        },
      });
      setItems(data.items);
      setTotalRecords(data.total ?? data.items.length);
      setTotalPages(data.pages ?? 1);
      if (data.summary) setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, pageSize, monthFilter, search]);
  useEffect(() => { if (page > totalPages) setPage(totalPages || 1); }, [totalPages, page]);

  const openAdd = () => {
    setEditingId(null);
    setError("");
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setError("");
    setForm({
      date: item.date || "",
      month: item.month || "",
      amountUSD: item.amountUSD || "",
      amountBDT: item.amountBDT || "",
      productName: item.productName || "",
      note: item.note || "",
    });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/boosting-cost/${editingId}`, form);
      } else {
        await api.post("/boosting-cost", form);
        setPage(1);
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item) => {
    if (!confirm(`Remove the "${item.productName}" boosting entry?`)) return;
    await api.delete(`/boosting-cost/${item._id}`);
    load();
  };

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalRecords);
  const isFiltered = monthFilter !== "ALL" || search;

  const pageNumbers = useMemo(() => {
    const span = 5;
    let start = Math.max(1, page - Math.floor(span / 2));
    let end = Math.min(totalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const isOverBudget = summary.remainingBDT < 0;

  return (
    <div className="space-y-5">
      {/* Endorsed vs used summary — endorsed total comes only from Expense
          entries with category BOOSTING_COST; everything on this page is a
          usage record against that. */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card !p-3 !px-4">
          <p className="text-xs text-slate-400">Total Endorsed (৳)</p>
          <p className="font-semibold text-lg">{formatBDT(summary.endorsedBDT)}</p>
        </div>
        <div className="card !p-3 !px-4">
          <p className="text-xs text-slate-400">Used So Far (৳)</p>
          <p className="font-semibold text-lg">{formatBDT(summary.usedBDT)}</p>
        </div>
        <div className="card !p-3 !px-4">
          <p className="text-xs text-slate-400">Used So Far ($)</p>
          <p className="font-semibold text-lg">{formatUSD(summary.usedUSD)}</p>
        </div>
        <div className={`card !p-3 !px-4 ${isOverBudget ? "ring-2 ring-red-300" : ""}`}>
          <p className="text-xs text-slate-400">Remaining (৳)</p>
          <p className={`font-semibold text-lg ${isOverBudget ? "text-red-600" : "text-emerald-600"}`}>
            {formatBDT(summary.remainingBDT)}
          </p>
        </div>
      </div>
      {isOverBudget && (
        <p className="text-xs text-red-600 -mt-2">
          You've used more than what's been endorsed for boosting — add another BOOSTING_COST expense to top up, or double-check entries below.
        </p>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input !pl-9 w-full"
              placeholder="Search product or note"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="relative sm:w-48">
            <select
              className="input w-full appearance-none pr-9"
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
            >
              <option value="ALL">All Months</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 justify-center shrink-0">
          <Plus size={16} /> Add Boosting Entry
        </button>
      </div>

      {isFiltered ? (
        <p className="text-xs text-slate-400 -mt-2">Showing {totalRecords} matching entries</p>
      ) : null}

      {/* Desktop / tablet table */}
      <div className="card overflow-x-auto p-0 hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Month</th>
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium text-right">Amount ($)</th>
              <th className="p-3 font-medium text-right">Amount (৳)</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">Loading entries...</td></tr>
            )}
            {!loading && items.map((it) => (
              <tr key={it._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                <td className="p-3 text-slate-500">{it.date || "—"}</td>
                <td className="p-3 text-slate-500">{it.month || "—"}</td>
                <td className="p-3 text-slate-700 font-medium">{it.productName}</td>
                <td className="p-3 text-right text-slate-600">{formatUSD(it.amountUSD)}</td>
                <td className="p-3 text-right font-medium">{formatBDT(it.amountBDT)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3 justify-end">
                    <button onClick={() => openEdit(it)} className="text-slate-400 hover:text-brand-600" title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => removeItem(it)} className="text-slate-400 hover:text-red-600" title="Remove">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">No boosting entries match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2 md:hidden">
        {loading && <div className="card text-center text-slate-400 py-6">Loading entries...</div>}
        {!loading && items.map((it) => (
          <div key={it._id} className="card !p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-400">{[it.date, it.month].filter(Boolean).join(" · ") || "No date"}</p>
                <p className="text-slate-700 font-medium mt-0.5">{it.productName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatBDT(it.amountBDT)}</p>
                <p className="text-xs text-slate-400">{formatUSD(it.amountUSD)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1 border-t border-slate-50">
              <button onClick={() => openEdit(it)} className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1">
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => removeItem(it)} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1">
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="card text-center text-slate-400 py-6">No boosting entries match your filters.</div>
        )}
      </div>

      {/* Pagination */}
      {totalRecords > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 order-2 sm:order-1">
            <span>Showing {rangeStart}–{rangeEnd} of {totalRecords}</span>
            <span className="hidden sm:inline">·</span>
            <div className="relative">
              <select
                className="input !py-1 !px-2 !text-xs w-auto appearance-none pr-6"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-1 order-1 sm:order-2 justify-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary !px-2 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers[0] > 1 && <span className="px-1 text-slate-300">…</span>}
            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`min-w-[2rem] px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  n === page ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {n}
              </button>
            ))}
            {pageNumbers[pageNumbers.length - 1] < totalPages && <span className="px-1 text-slate-300">…</span>}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary !px-2 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Boosting Entry" : "Add Boosting Entry"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date (or range)</label>
              <input
                className="input"
                placeholder="e.g. 18/02/2026 - 23/02/2026"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Month</label>
              <div className="relative">
                <select
                  className="input w-full appearance-none pr-9"
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })}
                >
                  <option value="">—</option>
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Boosting Product Name</label>
            <input
              className="input"
              required
              placeholder="e.g. Plastic Restore"
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Boosting Amount In Dollar ($)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.amountUSD}
                onChange={(e) => setForm({ ...form, amountUSD: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Boosting Amount In Taka (৳)</label>
              <input
                type="number"
                className="input"
                value={form.amountBDT}
                onChange={(e) => setForm({ ...form, amountBDT: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Note (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Save Entry"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}