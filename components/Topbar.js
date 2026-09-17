"use client";
import Link from "next/link";
import { Menu, LogOut, User } from "lucide-react";
import { logout, getUser } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function Topbar({ title, onMenuClick }) {
  const [user, setUser] = useState(null);
  useEffect(() => setUser(getUser()), []);

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-100 h-16 flex items-center justify-between gap-3 px-3 sm:px-4 lg:px-8">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button className="lg:hidden text-slate-500 shrink-0" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Always reachable, at every screen size — only the name/role text
            collapses on mobile so the avatar stays a valid tap target. */}
        <Link
          href="/profile"
          className="flex items-center gap-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl px-1.5 sm:px-2 py-1.5 -mx-1.5 sm:-mx-2 transition-colors"
          title="My Profile"
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
            <User size={16} />
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="font-medium leading-tight truncate">{user?.name || "User"}</p>
            <p className="text-xs text-slate-400 leading-tight truncate">{user?.role}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}