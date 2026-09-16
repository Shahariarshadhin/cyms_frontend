"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import { formatBDT } from "@/lib/auth";

const IN_TYPES = ["OWNER_DEPOSIT", "OTHER_INCOME", "REFUND_RECEIVED"];
const OUT_TYPES = ["WITHDRAWAL", "OTHER_PAYMENT"];
const NAME_TYPES = ["OWNER_DEPOSIT", "WITHDRAWAL"]; // types where a depositor/withdrawer name matters

// Types that can appear in the ledger view even though only some of them
// are creatable from this page's "Add" buttons (e.g. CUSTOMER_PAYMENT
// is generated elsewhere but should still be filterable here).
const FILTER_TYPES = [
  "OWNER_DEPOSIT",
  "CUSTOMER_PAYMENT",
  "OTHER_INCOME",
  "REFUND_RECEIVED",
  "WITHDRAWAL",
  "OTHER_PAYMENT",
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500];

const emptyForm = {
  transactionType: "OWNER_DEPOSIT",
  amount: "",
  description: "",
  depositorName: "",
  transactionDate: new Date().toISOString().slice(0, 10),
};

export default function FinancePage() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  // Filtering + pagination — resolved server-side so the running balance
  // (computed across the whole ledger on the backend) stays correct no
  // matter which page or filter is active.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadBalance = async () => {
    const { data } = await api.get("/transactions/balance");
    setBalance(data);
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/transactions", {
        params: {
          page,
          limit: pageSize,
          type: typeFilter !== "ALL" ? typeFilter : undefined,
          direction: directionFilter !== "ALL" ? directionFilter : undefined,
          search: search || undefined,
        },
      });
      setTransactions(data.transactions);
      setTotalRecords(data.total ?? data.transactions.length);
      setTotalPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);
  useEffect(() => {
    loadTransactions(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [page, pageSize, typeFilter, directionFilter, search]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages || 1);
  }, [totalPages, page]);

  const reloadAll = () => {
    loadBalance();
    loadTransactions();
  };

  const openAdd = (type) => {
    setEditingId(null);
    setError("");
    setForm({ ...emptyForm, transactionType: type });
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditingId(t._id);
    setError("");
    setForm({
      transactionType: t.transactionType,
      amount: t.amount,
      description: t.description || "",
      depositorName: t.depositorName || "",
      transactionDate: t.transactionDate
        ? t.transactionDate.slice(0, 10)
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
        await api.put(`/transactions/${editingId}`, form);
      } else {
        await api.post("/transactions", form);
        setPage(1);
      }
      setModalOpen(false);
      reloadAll();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };

  const removeTxn = async (t) => {
    if (
      !confirm(
        `Remove this ${t.transactionType
          .replace(/_/g, " ")
          .toLowerCase()} entry of ${formatBDT(t.amount)}?`
      )
    )
      return;
    await api.delete(`/transactions/${t._id}`);
    reloadAll();
  };

  const showNameField = NAME_TYPES.includes(form.transactionType);
  const isFiltered =
    typeFilter !== "ALL" || directionFilter !== "ALL" || search;
  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalRecords);

  const pageNumbers = useMemo(() => {
    const span = 5;
    let start = Math.max(1, page - Math.floor(span / 2));
    let end = Math.min(totalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-slate-400 mb-1">Current Balance</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatBDT(balance?.balance)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 mb-1">Total Money In</p>
          <p className="text-2xl font-bold text-emerald-600">
            {formatBDT(balance?.totalIn)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 mb-1">Total Money Out</p>
          <p className="text-2xl font-bold text-red-600">
            {formatBDT(balance?.totalOut)}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input !pl-9 w-full"
              placeholder="Search description or name"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="relative sm:w-48">
            <select
              className="input w-full appearance-none pr-9"
              value={directionFilter}
              onChange={(e) => {
                setDirectionFilter(e.target.value);
                setTypeFilter("ALL");
                setPage(1);
              }}
            >
              <option value="ALL">All Directions</option>
              <option value="IN">Money In</option>
              <option value="OUT">Money Out</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
          <div className="relative sm:w-56">
            <select
              className="input w-full appearance-none pr-9"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Types</option>
              {FILTER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
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
            onClick={() => openAdd("OWNER_DEPOSIT")}
            className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <ArrowDownCircle size={16} /> Add Deposit
          </button>
          <button
            onClick={() => openAdd("WITHDRAWAL")}
            className="btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <ArrowUpCircle size={16} /> Add Money Out
          </button>
        </div>
      </div>

      {isFiltered ? (
        <p className="text-xs text-slate-400 -mt-2">
          Showing {totalRecords} matching entries
        </p>
      ) : null}

      {/* Desktop / tablet table */}
      <div className="card overflow-x-auto p-0 hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Depositor</th>
              <th className="p-3 font-medium">Description</th>
              <th className="p-3 font-medium text-right">Money In</th>
              <th className="p-3 font-medium text-right">Money Out</th>
              <th className="p-3 font-medium text-right">Balance</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">
                  Loading transactions...
                </td>
              </tr>
            )}
            {!loading &&
              transactions.map((t) => (
                <tr
                  key={t._id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="p-3 text-slate-500">
                    {new Date(t.transactionDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`badge ${
                        t.direction === "IN"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {t.transactionType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 font-medium">
                    {t.depositorName || "—"}
                  </td>
                  <td className="p-3 text-slate-600">{t.description}</td>
                  <td className="p-3 text-right text-emerald-600 font-medium">
                    {t.direction === "IN" ? formatBDT(t.amount) : ""}
                  </td>
                  <td className="p-3 text-right text-red-600 font-medium">
                    {t.direction === "OUT" ? formatBDT(t.amount) : ""}
                  </td>
                  <td className="p-3 text-right text-slate-500">
                    {formatBDT(t.runningBalance)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-slate-400 hover:text-brand-600"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => removeTxn(t)}
                        className="text-slate-400 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && transactions.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">
                  No transactions match your filters.
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
            Loading transactions...
          </div>
        )}
        {!loading &&
          transactions.map((t) => (
            <div key={t._id} className="card !p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-400">
                    {new Date(t.transactionDate).toLocaleDateString()}
                    {t.depositorName ? ` · ${t.depositorName}` : ""}
                  </p>
                  <p className="text-slate-700 font-medium mt-0.5">
                    {t.description || "—"}
                  </p>
                </div>
                <p
                  className={`font-semibold shrink-0 ${
                    t.direction === "IN" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {t.direction === "IN" ? "+" : "-"}
                  {formatBDT(t.amount)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                <span
                  className={`badge ${
                    t.direction === "IN"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {t.transactionType.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-500">
                  Balance {formatBDT(t.runningBalance)}
                </span>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={() => openEdit(t)}
                  className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => removeTxn(t)}
                  className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          ))}
        {!loading && transactions.length === 0 && (
          <div className="card text-center text-slate-400 py-6">
            No transactions match your filters.
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
        title={editingId ? "Edit Transaction" : "Add Transaction"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.transactionType}
              onChange={(e) =>
                setForm({ ...form, transactionType: e.target.value })
              }
            >
              <optgroup label="Money In">
                {IN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Money Out">
                {OUT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {showNameField && (
            <div>
              <label className="label">
                {form.transactionType === "OWNER_DEPOSIT"
                  ? "Depositor Name (e.g. Saikat, Shovon)"
                  : "Withdrawn By"}
              </label>
              <input
                className="input"
                value={form.depositorName}
                onChange={(e) =>
                  setForm({ ...form, depositorName: e.target.value })
                }
                placeholder="Enter name"
              />
            </div>
          )}

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
                value={form.transactionDate}
                onChange={(e) =>
                  setForm({ ...form, transactionDate: e.target.value })
                }
              />
            </div>
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
              placeholder="e.g. 1st Profit Withdraw Deposit"
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
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
