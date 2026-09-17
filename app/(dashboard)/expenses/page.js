"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import { formatBDT } from "@/lib/auth";

const CATEGORIES = [
  "WEBSITE",
  "SOFTWARE",
  "MARKETING",
  "BOOSTING_COST",
  "MOBILE_Allowance",
  "TRAVEL_Allowance",
  "PRODUCT_RESEARCH",
  "COURIER",
  "PACKAGING",
  "PURCHASE_FOR_COMPANY",
  "SALARY",
  "SUBSCRIPTION",
  "PRODUCT_PURCHASE",
  "OTHER",
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500];

const emptyForm = {
  category: "OTHER",
  amount: "",
  description: "",
  paymentMethod: "CASH",
  expenseDate: new Date().toISOString().slice(0, 10),
};

// Deterministic, distinct color per category so the table stays legible
// as more categories are added, without hand-picking each one.
const CATEGORY_COLORS = [
  "bg-rose-50 text-rose-700",
  "bg-amber-50 text-amber-700",
  "bg-emerald-50 text-emerald-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
  "bg-teal-50 text-teal-700",
  "bg-orange-50 text-orange-700",
  "bg-indigo-50 text-indigo-700",
];
function categoryColor(category) {
  const idx = CATEGORIES.indexOf(category);
  return CATEGORY_COLORS[(idx < 0 ? 0 : idx) % CATEGORY_COLORS.length];
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  // Filtering + pagination state — these all live on the server now,
  // so the page only ever holds the current page's rows.
  const [searchInput, setSearchInput] = useState(""); // raw input, debounced below
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Server-reported pagination + totals
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    overallTotal: 0,
    thisMonthTotal: 0,
    overallCount: 0,
  });

  // Debounce free-text search so we don't fire a request on every keystroke
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
      const { data } = await api.get("/expenses", {
        params: {
          page,
          limit: pageSize,
          category: categoryFilter !== "ALL" ? categoryFilter : undefined,
          search: search || undefined,
        },
      });
      setExpenses(data.expenses);
      setTotalRecords(data.total ?? data.expenses.length);
      setTotalPages(data.pages ?? 1);
      if (data.summary) setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [page, pageSize, categoryFilter, search]);

  // If a filter change shrinks the result set below the current page, snap back
  useEffect(() => {
    if (page > totalPages) setPage(totalPages || 1);
  }, [totalPages, page]);

  const openAdd = () => {
    setEditingId(null);
    setError("");
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (e) => {
    setEditingId(e._id);
    setError("");
    setForm({
      category: e.category,
      amount: e.amount,
      description: e.description || "",
      paymentMethod: e.paymentMethod,
      expenseDate: e.expenseDate
        ? e.expenseDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, form);
      } else {
        await api.post("/expenses", form);
        setPage(1);
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (e) => {
    if (
      !confirm(
        `Remove this ${e.category
          .replace(/_/g, " ")
          .toLowerCase()} expense of ${formatBDT(e.amount)}?`
      )
    )
      return;
    await api.delete(`/expenses/${e._id}`);
    load();
  };

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalRecords);
  const isFiltered = categoryFilter !== "ALL" || search;

  const pageNumbers = useMemo(() => {
    // Show up to 5 page buttons centered on the current page
    const span = 5;
    let start = Math.max(1, page - Math.floor(span / 2));
    let end = Math.min(totalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <div className="space-y-5">
      {/* Stat summary — always reflects the whole dataset, not just the current page/filter */}
      <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3">
        <div className="card !p-3 !px-4">
          <p className="text-xs text-slate-400">Total Expenses</p>
          <p className="font-semibold text-lg">
            {formatBDT(summary.overallTotal)}
          </p>
        </div>
        <div className="card !p-3 !px-4">
          <p className="text-xs text-slate-400">This Month</p>
          <p className="font-semibold text-lg">
            {formatBDT(summary.thisMonthTotal)}
          </p>
        </div>
        <div className="card !p-3 !px-4">
          <p className="text-xs text-slate-400">Records</p>
          <p className="font-semibold text-lg">{summary.overallCount}</p>
        </div>
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
              placeholder="Search description or no."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="relative sm:w-56">
            <select
              className="input w-full appearance-none pr-9"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() =>
              window.open(
                `${process.env.NEXT_PUBLIC_API_URL}/excel/export/expenses`,
                "_blank"
              )
            }
            className="btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={openAdd}
            className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {isFiltered ? (
        <p className="text-xs text-slate-400 -mt-2">
          Showing {totalRecords} matching{" "}
          {categoryFilter !== "ALL"
            ? "in " + categoryFilter.replace(/_/g, " ")
            : "results"}
          {search ? ` for "${search}"` : ""}
        </p>
      ) : null}

      {/* Desktop / tablet table */}
      <div className="card overflow-x-auto p-0 hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">No.</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Description</th>
              <th className="p-3 font-medium">Method</th>
              <th className="p-3 font-medium text-right">Amount</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400">
                  Loading expenses...
                </td>
              </tr>
            )}
            {!loading &&
              expenses.map((e) => (
                <tr
                  key={e._id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="p-3 text-slate-500">{e.expenseNumber}</td>
                  <td className="p-3 text-slate-500">
                    {new Date(e.expenseDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <span className={`badge ${categoryColor(e.category)}`}>
                      {e.category.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{e.description}</td>
                  <td className="p-3 text-slate-500">{e.paymentMethod}</td>
                  <td className="p-3 text-right font-medium">
                    {formatBDT(e.amount)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => openEdit(e)}
                        className="text-slate-400 hover:text-brand-600"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => removeExpense(e)}
                        className="text-slate-400 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400">
                  No expenses match your filters.
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
            Loading expenses...
          </div>
        )}
        {!loading &&
          expenses.map((e) => (
            <div key={e._id} className="card !p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-400">
                    #{e.expenseNumber} ·{" "}
                    {new Date(e.expenseDate).toLocaleDateString()}
                  </p>
                  <p className="text-slate-700 font-medium mt-0.5">
                    {e.description || "—"}
                  </p>
                </div>
                <p className="font-semibold shrink-0">{formatBDT(e.amount)}</p>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                <span className={`badge ${categoryColor(e.category)}`}>
                  {e.category.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-500">
                  {e.paymentMethod}
                </span>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={() => openEdit(e)}
                  className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => removeExpense(e)}
                  className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          ))}
        {!loading && expenses.length === 0 && (
          <div className="card text-center text-slate-400 py-6">
            No expenses match your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalRecords > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 order-2 sm:order-1">
            <span>
              Showing {rangeStart}–{rangeEnd} of {totalRecords}
            </span>
            <span className="hidden sm:inline">·</span>
            <div className="relative">
              <select
                className="input !py-1 !px-2 !text-xs w-auto appearance-none pr-6"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
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
            {pageNumbers[0] > 1 && (
              <span className="px-1 text-slate-300">…</span>
            )}
            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`min-w-[2rem] px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  n === page
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {n}
              </button>
            ))}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <span className="px-1 text-slate-300">…</span>
            )}
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
        title={editingId ? "Edit Expense" : "Add Expense"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (৳)</label>
              <input
                type="number"
                className="input"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={form.expenseDate}
                onChange={(e) =>
                  setForm({ ...form, expenseDate: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select
              className="input"
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({ ...form, paymentMethod: e.target.value })
              }
            >
              {["CASH", "BKASH", "NAGAD", "BANK", "CARD", "OTHER"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
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
              {saving ? "Saving..." : editingId ? "Update" : "Save Expense"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
