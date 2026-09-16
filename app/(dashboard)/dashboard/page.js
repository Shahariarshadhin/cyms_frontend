"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Package, Boxes, CheckCircle2, TrendingUp, Wallet, Landmark, Clock } from "lucide-react";
import api from "@/lib/api";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { formatBDT } from "@/lib/auth";

const COLORS = ["#1db56b", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#64748b"];

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);
  const [inventoryChart, setInventoryChart] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [period, setPeriod] = useState("monthly");

  const load = async () => {
    const [s, sc, ec, ic, ro, ls] = await Promise.all([
      api.get("/dashboard/summary"),
      api.get(`/dashboard/sales-chart?period=${period}`),
      api.get("/dashboard/expense-chart"),
      api.get("/dashboard/inventory-chart"),
      api.get("/orders/recent"),
      api.get("/products/low-stock"),
    ]);
    setSummary(s.data);
    setSalesChart(sc.data);
    setExpenseChart(ec.data);
    setInventoryChart(ic.data);
    setRecentOrders(ro.data);
    setLowStock(ls.data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);

  if (!summary) return <div className="text-slate-400 text-sm">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={summary.totalProducts} icon={Package} tone="brand" />
        <StatCard label="In Stock" value={summary.inStock} icon={Boxes} tone="blue" />
        <StatCard label="Sold" value={summary.sold} icon={CheckCircle2} tone="amber" />
        <StatCard label="Pending Orders" value={summary.pendingOrders} icon={Clock} tone="red" />
        <StatCard label="Total Sales" value={formatBDT(summary.totalSales)} icon={TrendingUp} tone="brand" />
        <StatCard label="Total Profit" value={formatBDT(summary.totalProfit)} icon={TrendingUp} tone="blue" />
        <StatCard label="Total Expense" value={formatBDT(summary.totalExpense)} icon={Wallet} tone="red" />
        <StatCard label="Current Balance" value={formatBDT(summary.currentBalance)} icon={Landmark} tone="brand" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Sales & Profit</h3>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input !w-auto text-xs py-1">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatBDT(v)} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#1db56b" strokeWidth={2} name="Sales" />
              <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="font-semibold text-slate-900 mb-4">Expense by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={expenseChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatBDT(v)} />
              <Bar dataKey="total" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="font-semibold text-slate-900 mb-4">Inventory Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={inventoryChart} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                {inventoryChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="font-semibold text-slate-900 mb-4">Low Stock</h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {lowStock.length === 0 && <p className="text-sm text-slate-400">No products below minimum stock.</p>}
            {lowStock.map((p) => (
              <div key={p._id} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-medium text-slate-800">{p.watchName}</p>
                  <p className="text-xs text-slate-400">{p.sku}</p>
                </div>
                <span className="badge bg-red-100 text-red-700">{p.quantity} left</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card overflow-x-auto">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Orders</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">Order</th>
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o._id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 font-medium text-slate-800">{o.orderNumber}</td>
                <td className="py-2.5 text-slate-600">{o.customer?.name}</td>
                <td className="py-2.5 text-slate-600">{formatBDT(o.totalAmount)}</td>
                <td className="py-2.5"><StatusBadge status={o.status} /></td>
                <td className="py-2.5"><StatusBadge status={o.deliveryStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
