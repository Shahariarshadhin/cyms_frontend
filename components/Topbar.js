"use client";
import { Menu, LogOut, User } from "lucide-react";
import { logout, getUser } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function Topbar({ title, onMenuClick }) {
  const [user, setUser] = useState(null);
  useEffect(() => setUser(getUser()), []);

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-100 h-16 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-slate-500" onClick={onMenuClick}><Menu size={20} /></button>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
            <User size={16} />
          </div>
          <div>
            <p className="font-medium leading-tight">{user?.name || "User"}</p>
            <p className="text-xs text-slate-400 leading-tight">{user?.role}</p>
          </div>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors" title="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
