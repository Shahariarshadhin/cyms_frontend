"use client";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, ShieldAlert, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { formatBDT } from "@/lib/auth";

const PAGE_SIZE = 30;

const TABS = [
  { value: "PRODUCT", label: "Product changes" },
  { value: "AUTH", label: "Logins" },
];

const ACTIONS = {
  PRODUCT: [
    { value: "", label: "All actions" },
    { value: "CREATE", label: "Created" },
    { value: "UPDATE", label: "Updated" },
    { value: "DELETE", label: "Deleted" },
    { value: "DEACTIVATE", label: "Deactivated" },
  ],
  AUTH: [
    { value: "", label: "All logins" },
    { value: "LOGIN", label: "Signed in" },
    { value: "LOGIN_FAILED", label: "Failed sign-in" },
  ],
};

const ACTION_STYLE = {
  CREATE: { label: "Created", cls: "bg-emerald-50 text-emerald-700" },
  UPDATE: { label: "Updated", cls: "bg-sky-50 text-sky-700" },
  DELETE: { label: "Deleted", cls: "bg-rose-50 text-rose-700" },
  DEACTIVATE: { label: "Deactivated", cls: "bg-amber-50 text-amber-700" },
  LOGIN: { label: "Signed in", cls: "bg-emerald-50 text-emerald-700" },
  LOGIN_FAILED: { label: "Failed sign-in", cls: "bg-rose-50 text-rose-700" },
};

const FIELD_LABELS = {
  sku: "SKU",
  modelName: "Model name",
  watchName: "Watch name",
  brand: "Brand",
  category: "Category",
  gender: "For",
  description: "Description",
  purchasePrice: "Purchase price",
  additionalCost: "Additional cost",
  estSellingMin: "Est. min price",
  estSellingMax: "Est. max price",
  minimumStock: "Min stock",
  image: "Photo",
  isActive: "Active",
};

const MONEY_FIELDS = ["purchasePrice", "additionalCost", "estSellingMin", "estSellingMax"];

function fmtValue(field, v) {
  if (v === "" || v === null || v === undefined) return "empty";
  if (MONEY_FIELDS.includes(field)) return formatBDT(Number(v));
  if (field === "image") return "photo";
  if (field === "isActive") return v === true || v === "true" ? "Yes" : "No";
  if (field === "gender") return v === "LADIES" ? "Ladies" : "Men";
  const s = String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// "Chrome on Windows" style summary from a user-agent string
function shortAgent(ua = "") {
  if (!ua) return "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

export default function ActivityPage() {
  const [tab, setTab] = useState("PRODUCT");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [tab, action, search, from, to]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/audit", {
          params: {
            entity: tab,
            action: action || undefined,
            search: search || undefined,
            from: from || undefined,
            to: to || undefined,
            page,
            limit: PAGE_SIZE,
          },
        });
        if (!cancelled) {
          setData(data);
          setForbidden(false);
        }
      } catch (err) {
        if (err?.response?.status === 403 && !cancelled) setForbidden(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250); // small debounce for the search box
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tab, action, search, from, to, page]);

  const changeTab = (v) => {
    setTab(v);
    setAction("");
  };

  if (forbidden) {
    return (
      <div className="card max-w-md mx-auto text-center py-10">
        <ShieldAlert className="mx-auto text-slate-300 mb-3" size={36} />
        <p className="font-medium text-slate-700">
          Only Admins can view the activity log
        </p>
        <p className="text-sm text-slate-400 mt-1">
          Ask your Super Admin to grant you access.
        </p>
      </div>
    );
  }

  const isAuth = tab === "AUTH";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
          Activity log
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          See who changed products and when people signed in.
        </p>
      </div>

      <div className="card !p-3 sm:!p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="inline-flex bg-slate-100 rounded-xl p-1 self-start">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => changeTab(t.value)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  tab === t.value
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 lg:items-center">
            <div className="relative sm:w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="input !pl-9 w-full"
                placeholder={isAuth ? "Search name or email" : "Search user or product"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative sm:w-44">
              <select
                className="input w-full appearance-none pr-9"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                aria-label="Action"
              >
                {ACTIONS[tab].map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
            <input
              type="date"
              className="input sm:w-40"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
            />
            <input
              type="date"
              className="input sm:w-40"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {loading
            ? "Loading..."
            : `${data.total} event${data.total === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-600 bg-slate-100/80 border-b border-slate-200 [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wider">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">{isAuth ? "Details" : "Product and changes"}</th>
                <th className="px-4 py-3">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4" colSpan={5}>
                      <div className="h-3 w-2/3 bg-slate-100 rounded" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                data.logs.map((log) => {
                  const style = ACTION_STYLE[log.action] || {
                    label: log.action,
                    cls: "bg-slate-100 text-slate-600",
                  };
                  return (
                    <tr key={log._id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                        {fmtTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {log.userName || "Unknown user"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {log.userEmail}
                          {log.userRole && ` (${log.userRole.replace("_", " ").toLowerCase()})`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${style.cls}`}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[240px]">
                        {!isAuth && (
                          <p className="font-medium text-slate-800">
                            {log.entityLabel}
                          </p>
                        )}
                        {log.action === "UPDATE" && log.changes?.length > 0 && (
                          <ul className="mt-1 space-y-0.5 text-xs">
                            {log.changes.map((c, i) => (
                              <li key={i} className="text-slate-600">
                                <span className="text-slate-400">
                                  {FIELD_LABELS[c.field] || c.field}:
                                </span>{" "}
                                {fmtValue(c.field, c.from)} →{" "}
                                <span className="font-medium text-slate-800">
                                  {fmtValue(c.field, c.to)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {log.note && (
                          <p className="text-xs text-slate-400 mt-0.5">{log.note}</p>
                        )}
                        {isAuth && !log.note && (
                          <p className="text-xs text-slate-400">
                            {log.action === "LOGIN" ? "Signed in successfully" : "Wrong email or password"}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <p>{shortAgent(log.userAgent)}</p>
                        <p className="text-slate-400">{log.ip}</p>
                      </td>
                    </tr>
                  );
                })}

              {!loading && data.logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <p className="font-medium text-slate-700">No activity found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try a different date range or filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && data.pages > 1 && (
        <div className="card !p-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page <b className="text-slate-700">{page}</b> of{" "}
            <b className="text-slate-700">{data.pages}</b>
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
              className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}