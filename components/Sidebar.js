"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  ShoppingCart,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  UserCog,
  X,
  Rocket, 
  FlaskConical,
} from "lucide-react";
import { getUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/research", label: "Research & Buy", icon: FlaskConical },
  { href: "/deliveries", label: "Delivery", icon: Truck },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/boosting-cost", label: "Boosting Cost", icon: Rocket},
];

// Only Super Admin sees Users & Roles management
const adminNav = { href: "/users", label: "Users & Roles", icon: UserCog };

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const user = getUser();
    setIsSuperAdmin(user?.role === "SUPER_ADMIN");
  }, []);

  const items = isSuperAdmin ? [...nav, adminNav] : nav;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 z-40 flex flex-col transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-16 h-12 rounded-xl  flex items-center justify-center text-white font-bold text-sm">
             
                <Image
                  src="/assets/logo/Cozy-Yards.png"
                  alt="Cozy Yards"
                  width={100}
                  height={100}
                  className="object-contain"
                />
             
            </div>
            <div>
              <p className="font-bold text-brand-600 text-xl leading-tight">
                CYMS
              </p>
              {/* <p className="text-[11px] text-slate-400 leading-tight">CYMS</p> */}
            </div>
          </div>
          <button className="lg:hidden text-slate-400" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            <Settings size={18} /> Settings
          </Link>
        </div>
      </aside>
    </>
  );
}
