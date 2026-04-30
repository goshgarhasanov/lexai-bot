import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import api from "../api/client";

const links = [
  { to: "/dashboard",  icon: "📊", label: "Dashboard" },
  { to: "/users",      icon: "👥", label: "İstifadəçilər" },
  { to: "/payments",   icon: "💳", label: "Ödənişlər",   badge: "pending" },
  { to: "/bot-stats",  icon: "📈", label: "Bot Statistika" },
  { to: "/audit-logs", icon: "📋", label: "Audit Loglar" },
  { to: "/banned-ips", icon: "🚫", label: "Ban İdarəetməsi" },
];

export default function Layout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen]         = useState(false);
  const [pending, setPending]   = useState(0);

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Pending payment badge
  useEffect(() => {
    const load = () =>
      api.get("/payments?status=pending")
        .then(r => setPending(r.data?.length || 0))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const logout = () => { localStorage.removeItem("token"); nav("/login"); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">HuquqAI</h1>
            <p className="text-gray-500 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <span className="text-base">{icon}</span>
            <span className="flex-1">{label}</span>
            {badge === "pending" && pending > 0 && (
              <span className="bg-yellow-500 text-yellow-950 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {pending}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-all"
        >
          <span>🚪</span> Çıxış
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 lg:w-60 bg-gray-900 border-r border-gray-800 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside className={`fixed top-0 left-0 h-full w-64 z-40 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <span className="text-white font-semibold">⚖️ HuquqAI</span>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-gray-400 hover:text-white transition p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-semibold text-sm">⚖️ HuquqAI Admin</span>
          {pending > 0 && (
            <span className="bg-yellow-500 text-yellow-950 text-xs font-bold px-2 py-0.5 rounded-full">{pending}</span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
