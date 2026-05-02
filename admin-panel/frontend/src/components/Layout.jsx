import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import api from "../api/client";

const NAV_GROUPS = [
  {
    items: [
      { to: "/dashboard",         icon: "📊", label: "Dashboard" },
    ],
  },
  {
    label: "İstifadəçilər",
    items: [
      { to: "/users",             icon: "👥", label: "Bütün İstifadəçilər" },
      { to: "/user-segments",     icon: "🎯", label: "Seqmentlər", badge: "atRisk" },
    ],
  },
  {
    label: "Maliyyə",
    items: [
      { to: "/payments",          icon: "💳", label: "Ödənişlər",   badge: "pending" },
      { to: "/revenue-analytics", icon: "💰", label: "Gəlir Analitikası" },
    ],
  },
  {
    label: "Bot & Analitika",
    items: [
      { to: "/bot-performance",   icon: "🤖", label: "Bot Performansı" },
      { to: "/bot-stats",         icon: "📈", label: "Bot Statistika" },
    ],
  },
  {
    label: "İdarəetmə",
    items: [
      { to: "/broadcast",         icon: "📣", label: "Broadcast" },
      { to: "/audit-logs",        icon: "📋", label: "Audit Loglar" },
      { to: "/banned-ips",        icon: "🚫", label: "Ban İdarəetməsi" },
      { to: "/system-config",     icon: "⚙️", label: "Sistem Konfiq." },
    ],
  },
];

export default function Layout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [open,    setOpen]    = useState(false);
  const [pending, setPending] = useState(0);
  const [atRisk,  setAtRisk]  = useState(0);
  const [health,  setHealth]  = useState(null);

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  useEffect(() => {
    const load = () => {
      api.get("/payments?status=pending").then(r => setPending(r.data?.length || 0)).catch(() => {});
      api.get("/health-check").then(r => setHealth(r.data)).catch(() => {});
      api.get("/user-segments").then(r => setAtRisk(r.data?.at_risk?.count || 0)).catch(() => {});
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const logout = () => { localStorage.removeItem("token"); nav("/login"); };
  const adminUser = (() => { try { return JSON.parse(atob(localStorage.getItem("token")?.split(".")[1] || ""))?.username; } catch { return "admin"; } })();

  const getBadge = (type) => {
    if (type === "pending" && pending > 0) return pending;
    if (type === "atRisk"  && atRisk  > 0) return atRisk;
    return null;
  };

  const NavContent = () => (
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

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4" aria-label="Əsas naviqasiya">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-3 py-1 text-gray-600 text-xs uppercase tracking-wider font-medium">{group.label}</div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, icon, label, badge }) => {
                const badgeVal = badge ? getBadge(badge) : null;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`
                    }
                  >
                    <span className="text-base w-5 text-center">{icon}</span>
                    <span className="flex-1 truncate">{label}</span>
                    {badgeVal != null && (
                      <span className="bg-yellow-500 text-yellow-950 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                        {badgeVal}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-800 space-y-2">
        {/* System status */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className={`w-2 h-2 rounded-full ${health?.status === "ok" ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-gray-500 text-xs">{health?.status === "ok" ? "Sistem aktiv" : "Sistem xəta"}</span>
        </div>
        {/* Admin user */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(adminUser || "A")[0].toUpperCase()}
          </div>
          <span className="text-gray-400 text-xs truncate">{adminUser}</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-all"
          aria-label="Çıxış"
        >
          <span className="w-5 text-center">🚪</span> Çıxış
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 lg:w-64 bg-gray-900 border-r border-gray-800 flex-col shrink-0">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* Mobile drawer */}
      <aside className={`fixed top-0 left-0 h-full w-64 z-40 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <span className="text-white font-semibold">⚖️ HuquqAI Admin</span>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-xl transition" aria-label="Menyu bağla">✕</button>
        </div>
        <NavContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
          <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-white transition p-1" aria-label="Menyu aç">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-semibold text-sm">⚖️ HuquqAI Admin</span>
          <div className="flex items-center gap-1.5">
            {pending > 0 && <span className="bg-yellow-500 text-yellow-950 text-xs font-bold px-2 py-0.5 rounded-full">{pending}</span>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
