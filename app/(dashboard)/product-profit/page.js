"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Search,
  X,
  Package,
  Wallet,
  Receipt,
  PiggyBank,
} from "lucide-react";
import api from "@/lib/api";
import { formatBDT } from "@/lib/auth";

const PAGE_SIZE = 10;

const RANGES = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
];

const SORTS = [
  { value: "PROFIT_DESC", label: "Profit: high to low" },
  { value: "PROFIT_ASC", label: "Profit: low to high" },
  { value: "MARGIN_DESC", label: "Margin: high to low" },
  { value: "UNITS_DESC", label: "Units: most sold" },
  { value: "NAME", label: "Name A–Z" },
];

const profitColor = (n) => (n >= 0 ? "text-emerald-600" : "text-rose-600");
const marginOf = (p) =>
  p.sellingTotal > 0 ? Math.round((p.profit / p.sellingTotal) * 100) : 0;

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

function StatCard({ icon: Icon, label, value, tone, hint }) {
  const tones = {
    violet: "from-violet-500 to-violet-600",
    sky: "from-sky-500 to-sky-600",
    amber: "from-amber-500 to-orange-500",
    emerald: "from-emerald-500 to-emerald-600",
    rose: "from-rose-500 to-rose-600",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tones[tone]} p-4 text-white shadow-sm`}
    >
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -right-1 top-10 h-14 w-14 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/80">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl">
            {value}
          </p>
          {hint && <p className="mt-0.5 text-[11px] text-white/70">{hint}</p>}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function MarginPill({ value }) {
  const good = value >= 30;
  const ok = value >= 10 && value < 30;
  const tone =
    value < 0
      ? "bg-rose-50 text-rose-700"
      : good
        ? "bg-emerald-50 text-emerald-700"
        : ok
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`}
    >
      {value}%
    </span>
  );
}

function Avatar({ name }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-semibold text-white">
      {letter}
    </div>
  );
}

export default function ProductProfitPage() {
  const [range, setRange] = useState("this_month");
  const [data, setData] = useState({ products: [], totals: null });
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [sales, setSales] = useState({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("PROFIT_DESC");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setOpenId(null);
    setSales({});
    api
      .get("/reports/product-profit", { params: { range } })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    setPage(1);
    setOpenId(null);
  }, [search, sortBy, range]);

  const toggle = async (id) => {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    if (!sales[id]) {
      const { data } = await api.get(`/reports/product-profit/${id}`, {
        params: { range },
      });
      setSales((s) => ({ ...s, [id]: data }));
    }
  };

  const { products, totals } = data;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter(
      (p) => !q || (p.productName || "").toLowerCase().includes(q),
    );
    const sorted = [...list];
    switch (sortBy) {
      case "PROFIT_ASC":
        sorted.sort((a, b) => a.profit - b.profit);
        break;
      case "MARGIN_DESC":
        sorted.sort((a, b) => marginOf(b) - marginOf(a));
        break;
      case "UNITS_DESC":
        sorted.sort((a, b) => b.unitsSold - a.unitsSold);
        break;
      case "NAME":
        sorted.sort((a, b) =>
          (a.productName || "").localeCompare(b.productName || ""),
        );
        break;
      default:
        sorted.sort((a, b) => b.profit - a.profit);
    }
    return sorted;
  }, [products, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const rangeFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const rangeTo = Math.min(pageStart + PAGE_SIZE, filtered.length);

  const goToPage = (n) => {
    setPage(n);
    setOpenId(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const totalCost = totals ? totals.purchaseCost + totals.otherCost : 0;
  const overallMargin =
    totals && totals.sellingTotal > 0
      ? Math.round((totals.profit / totals.sellingTotal) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 sm:text-2xl">
            Product Profit
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Profit per product from delivered orders only
          </p>
        </div>
        <div className="relative sm:w-48">
          <select
            className="input w-full appearance-none pr-9"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Date range"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Package}
          tone="violet"
          label="Units delivered"
          value={totals ? totals.unitsSold : "—"}
          hint={`${products.length} product${products.length === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={Wallet}
          tone="sky"
          label="Total selling"
          value={totals ? formatBDT(totals.sellingTotal) : "—"}
        />
        <StatCard
          icon={Receipt}
          tone="amber"
          label="Total cost"
          value={totals ? formatBDT(totalCost) : "—"}
          hint="Purchase + other cost"
        />
        <StatCard
          icon={PiggyBank}
          tone={totals && totals.profit < 0 ? "rose" : "emerald"}
          label="Total profit"
          value={totals ? formatBDT(totals.profit) : "—"}
          hint={totals ? `${overallMargin}% margin` : ""}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input !pl-9 !pr-9 w-full"
            placeholder="Search product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="relative sm:w-56">
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

      <p className="text-xs text-slate-500">
        {loading
          ? "Loading..."
          : `Showing ${rangeFrom}–${rangeTo} of ${filtered.length}`}
      </p>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-left text-[11px] uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 text-right font-semibold">Units</th>
                <th className="px-4 py-3 text-right font-semibold">Purchase</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Other cost
                </th>
                <th className="px-4 py-3 text-right font-semibold">Selling</th>
                <th className="px-4 py-3 text-right font-semibold">Profit</th>
                <th className="px-4 py-3 font-semibold">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4" colSpan={7}>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100" />
                        <div className="h-3 w-1/3 rounded bg-slate-100" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <TrendingUp size={22} />
                    </div>
                    <p className="font-medium text-slate-700">
                      {search
                        ? "No products match your search"
                        : "No delivered orders in this period"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {search
                        ? "Try a different name."
                        : "Try a wider date range."}
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                paged.map((p) => (
                  <ProductRow
                    key={p._id}
                    p={p}
                    open={openId === p._id}
                    rows={sales[p._id]}
                    onToggle={() => toggle(p._id)}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="card !p-3 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Page <b className="text-slate-700">{currentPage}</b> of{" "}
            <b className="text-slate-700">{totalPages}</b>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {getPageNumbers(currentPage, totalPages).map((n, i) =>
              n === "..." ? (
                <span
                  key={`dots-${i}`}
                  className="w-9 text-center text-slate-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => goToPage(n)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={`h-9 min-w-9 rounded-lg px-2 text-sm font-medium tabular-nums transition-colors ${
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
              className="flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRow({ p, open, rows, onToggle }) {
  const margin = marginOf(p);
  const barWidth = Math.min(Math.max(margin, 0), 100);
  const barColor =
    margin < 0
      ? "bg-rose-500"
      : margin >= 30
        ? "bg-emerald-500"
        : margin >= 10
          ? "bg-amber-500"
          : "bg-slate-400";

  return (
    <>
      <tr
        onClick={onToggle}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onToggle();
        }}
        className={`cursor-pointer transition-colors hover:bg-slate-50/80 focus:outline-none focus-visible:bg-slate-50 ${
          open ? "bg-slate-50/80" : ""
        }`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={p.productName} />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">
                {p.productName}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-slate-400">
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {open ? "Hide sales" : "View sales"}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
          {p.unitsSold}
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
          {formatBDT(p.purchaseCost)}
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
          {formatBDT(p.otherCost)}
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
          {formatBDT(p.sellingTotal)}
        </td>
        <td
          className={`px-4 py-3 text-right font-semibold tabular-nums ${profitColor(p.profit)}`}
        >
          {formatBDT(p.profit)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <MarginPill value={margin} />
          </div>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-4 py-4">
            {!rows ? (
              <p className="text-xs text-slate-400">Loading sales...</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full min-w-[620px] text-xs">
                    <thead className="sticky top-0 bg-slate-100/90 text-slate-500">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium">Order</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Purchase
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Other cost
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Selling
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-slate-700">
                            {r.orderNumber}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {new Date(r.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatBDT(r.purchasePrice)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatBDT(r.otherCost)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatBDT(r.sellingPrice)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {r.quantity}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-semibold tabular-nums ${profitColor(r.profit)}`}
                          >
                            {formatBDT(r.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
