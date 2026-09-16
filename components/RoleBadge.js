const ROLE_STYLES = {
    SUPER_ADMIN: "bg-violet-100 text-violet-700",
    ADMIN: "bg-blue-100 text-blue-700",
    MANAGER: "bg-indigo-100 text-indigo-700",
    SALES: "bg-emerald-100 text-emerald-700",
    INVENTORY_MANAGER: "bg-amber-100 text-amber-700",
    ACCOUNTS: "bg-teal-100 text-teal-700",
  };
  
  const ROLE_LABELS = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    MANAGER: "Manager",
    SALES: "Sales",
    INVENTORY_MANAGER: "Inventory Manager",
    ACCOUNTS: "Accounts",
  };
  
  export default function RoleBadge({ role }) {
    const cls = ROLE_STYLES[role] || "bg-slate-100 text-slate-600";
    return <span className={`badge ${cls}`}>{ROLE_LABELS[role] || role}</span>;
  }