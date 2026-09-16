"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatBDT } from "@/lib/auth";

const RANGES = [
  { value: "today", label: "Today" }, { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" }, { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" }, { value: "this_year", label: "This Year" },
];

const TABS = ["Sales", "Profit", "Inventory", "Expenses", "Customers"];

export default function ReportsPage() {
  const [tab, setTab] = useState("Sales");
  const [range, setRange] = useState("this_month");
  const [sales, setSales] = useState(null);
  const [profit, setProfit] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [customers, setCustomers] = useState(null);

  useEffect(() => {
    api.get("/reports/sales", { params: { range } }).then((r) => setSales(r.data));
    api.get("/reports/profit", { params: { range } }).then((r) => setProfit(r.data));
    api.get("/reports/expenses", { params: { range } }).then((r) => setExpenses(r.data));
  }, [range]);

  useEffect(() => {
    api.get("/reports/inventory").then((r) => setInventory(r.data));
    api.get("/reports/customers").then((r) => setCustomers(r.data));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 w-fit overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {t}
            </button>
          ))}
        </div>
        {(tab === "Sales" || tab === "Profit" || tab === "Expenses") && (
          <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        )}
      </div>

      {tab === "Sales" && sales && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Metric label="Orders" value={sales.ordersCount} />
          <Metric label="Units Sold" value={sales.unitsSold} />
          <Metric label="Sales" value={formatBDT(sales.sales)} />
          <Metric label="Discount" value={formatBDT(sales.discount)} />
          <Metric label="Delivery Revenue" value={formatBDT(sales.deliveryRevenue)} />
          <Metric label="Total Revenue" value={formatBDT(sales.totalRevenue)} highlight />
        </div>
      )}

      {tab === "Profit" && profit && (
        <div className="card max-w-md space-y-2 text-sm">
          <Row label="Sales" value={formatBDT(profit.sales)} />
          <Row label="Product Cost" value={"-" + formatBDT(profit.productCost)} />
          <Row label="Additional Cost" value={"-" + formatBDT(profit.additionalCost)} />
          <div className="border-t border-slate-100 my-2" />
          <Row label="Gross Profit" value={formatBDT(profit.grossProfit)} bold />
          <Row label="Other Business Expense" value={"-" + formatBDT(profit.otherExpense)} />
          <div className="border-t border-slate-100 my-2" />
          <Row label="Net Business Result" value={formatBDT(profit.netProfit)} bold highlight />
        </div>
      )}

      {tab === "Inventory" && inventory && (
        <div className="space-y-5">
          <div className="card">
            <h4 className="font-medium text-sm mb-3">Low Stock ({inventory.lowStock.length})</h4>
            <table className="w-full text-sm">
              <tbody>
                {inventory.lowStock.map((p) => (
                  <tr key={p._id} className="border-b border-slate-50">
                    <td className="py-2">{p.watchName}</td>
                    <td className="py-2 text-right">{p.quantity} / min {p.minimumStock}</td>
                  </tr>
                ))}
                {inventory.lowStock.length === 0 && <tr><td className="py-3 text-slate-400 text-center">All products sufficiently stocked.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h4 className="font-medium text-sm mb-3">Current Inventory ({inventory.current.length} in stock)</h4>
            <p className="text-xs text-slate-400">Total sold units: {inventory.sold.length}</p>
          </div>
        </div>
      )}

      {tab === "Expenses" && expenses && (
        <div className="card max-w-md">
          <table className="w-full text-sm">
            <tbody>
              {expenses.categories.map((c) => (
                <tr key={c.category} className="border-b border-slate-50">
                  <td className="py-2">{c.category.replace(/_/g, " ")}</td>
                  <td className="py-2 text-right font-medium">{formatBDT(c.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td className="pt-3 font-semibold">Total</td><td className="pt-3 text-right font-semibold">{formatBDT(expenses.grandTotal)}</td></tr>
            </tfoot>
          </table>
        </div>
      )}

      {tab === "Customers" && customers && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Metric label="Total Customers" value={customers.totalCustomers} />
            <Metric label="Repeat Customers" value={customers.repeatCustomers} />
          </div>
          <div className="card">
            <h4 className="font-medium text-sm mb-3">Top Customers</h4>
            <table className="w-full text-sm">
              <tbody>
                {customers.topCustomers.map((c) => (
                  <tr key={c.customer._id} className="border-b border-slate-50">
                    <td className="py-2">{c.customer.name}</td>
                    <td className="py-2 text-slate-500">{c.orders} orders</td>
                    <td className="py-2 text-right font-medium">{formatBDT(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div className={`card ${highlight ? "border-brand-200 bg-brand-50/40" : ""}`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ label, value, bold, highlight }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""} ${highlight ? "text-brand-700 text-base" : "text-slate-600"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
