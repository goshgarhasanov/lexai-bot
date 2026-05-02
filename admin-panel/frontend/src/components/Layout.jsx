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

function HamburgerIcon({ open }) {
  return (
    <span className="relative w-6 h-6 inline-block">
      <span className={`absolute left-0 right-0 h-0.5 bg-current rounded-full transition-all duration-350 ease-smooth
                        ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-1.5"}`} />
      <span className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-current rounded-full transition-all duration-200 ease-emph
                        ${open ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"}`} />
      <span className={`absolute left-0 right-0 h-0.5 bg-current rounded-full transition-all duration-350 ease-smooth
                        ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-1.5"}`} />
    </span>
  );
}

const PAGE_TITLES = {
  "/dashboard":         { icon: "📊", title: "Dashboard" },
  "/users":             { icon: "👥", title: "İstifadəçilər" },
  "/user-segments":     { icon: "🎯", title: "Seqmentlər" },
  "/payments":          { icon: "💳", title: "Ödənişlər" },
  "/revenue-analytics": { icon: "💰", title: "Gəlir Analitikası" },
  "/bot-performance":   { icon: "🤖", title: "Bot Performansı" },
  "/bot-stats":         { icon: "📈", title: "Bot Statistika" },
  "/broadcast":         { icon: "📣", title: "Broadcast" },
  "/audit-logs":        { icon: "📋", title: "Audit Loglar" },
  "/banned-ips":        { icon: "🚫", title: "Ban İdarəetməsi" },
  "/system-config":     { icon: "⚙️", title: "Sistem Konfiq." },
};

export default function Layout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [open,    setOpen]    = useState(false);
  const [pending, setPending] = useState(0);
  const [atRisk,  setAtRisk]  = useState(0);
  const [health,  setHealth]  = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Lock body scroll while drawer open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ESC closes drawer
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const pageMeta = PAGE_TITLES[loc.pathname] || { icon: "⚖️", title: "HuquqAI Admin" };

  const NavContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3 group">
          <span className="text-2xl transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:rotate-6">⚖️</span>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">HuquqAI</h1>
            <p className="text-gray-500 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4" aria-label="Əsas naviqasiya">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={mobile ? "animate-fade-in-left" : ""} style={mobile ? { animationDelay: `${gi * 60}ms`, animationFillMode: "both" } : {}}>
            {group.label && (
              <div className="px-3 py-1 text-gray-600 text-[11px] uppercase tracking-wider font-semibold">{group.label}</div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, icon, label, badge }) => {
                const badgeVal = badge ? getBadge(badge) : null;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       transition-all duration-250 ease-smooth
                       ${isActive
                          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-900/40"
                          : "text-gray-400 hover:bg-gray-800/70 hover:text-white hover:translate-x-0.5"}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/80 rounded-r-full" />
                        )}
                        <span className={`text-base w-5 text-center transition-transform duration-300 ease-spring
                                          ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                          {icon}
                        </span>
                        <span className="flex-1 truncate">{label}</span>
                        {badgeVal != null && (
                          <span className="bg-yellow-400 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none animate-pulse-soft">
                            {badgeVal}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-800 space-y-1 shrink-0">
        {/* System status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg">
          <span className="relative flex h-2 w-2">
            {health?.status === "ok" && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping-soft" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${health?.status === "ok" ? "bg-green-400" : "bg-red-400"}`} />
          </span>
          <span className="text-gray-500 text-xs">{health?.status === "ok" ? "Sistem aktiv" : "Sistem xəta"}</span>
        </div>
        {/* Admin user */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md shadow-blue-900/30">
            {(adminUser || "A")[0].toUpperCase()}
          </div>
          <span className="text-gray-300 text-xs truncate">{adminUser}</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-red-950/40 hover:text-red-300 transition-all duration-200 ease-emph active:scale-[0.98]"
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
      <aside className="hidden md:flex w-60 lg:w-64 bg-gray-900/95 border-r border-gray-800 flex-col shrink-0">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden transition-opacity duration-300 ease-emph
                    ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 max-w-[82vw] z-40 bg-gray-900 border-r border-gray-800 flex flex-col
                    transform transition-transform duration-350 ease-smooth md:hidden shadow-2xl
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800 shrink-0">
          <span className="text-white font-semibold flex items-center gap-2">
            <span className="text-xl">⚖️</span> HuquqAI Admin
          </span>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-all duration-200 active:scale-90"
            aria-label="Menyu bağla"
          >
            <span className="text-xl leading-none">✕</span>
          </button>
        </div>
        <NavContent mobile />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky topbar with scroll-aware blur */}
        <header
          className={`sticky top-0 z-20 flex items-center justify-between px-4 py-3 md:px-6 md:py-4
                      border-b transition-all duration-300 ease-smooth shrink-0
                      ${scrolled ? "glass-strong border-gray-800/80 shadow-md" : "bg-gray-900/60 border-gray-900"}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setOpen(true)}
              className="md:hidden text-gray-300 hover:text-white p-2 -ml-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 active:scale-90"
              aria-label="Menyu aç"
            >
              <HamburgerIcon open={false} />
            </button>
            <div className="min-w-0">
              <h1 key={loc.pathname} className="text-white font-semibold text-base md:text-lg truncate animate-fade-in-down">
                <span className="mr-2">{pageMeta.icon}</span>{pageMeta.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className={`hidden xs:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all duration-300
                             ${health?.status === "ok"
                                ? "bg-green-950/60 border-green-800/60 text-green-400"
                                : "bg-red-950/60 border-red-800/60 text-red-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.status === "ok" ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              <span className="hidden sm:inline">{health?.status === "ok" ? "Online" : "Offline"}</span>
            </div>
            {pending > 0 && (
              <span className="bg-yellow-400 text-yellow-950 text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse-soft">
                {pending}
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-900/30">
              {(adminUser || "A")[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
          id="main-content"
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 8)}
        >
          {/* Key on pathname → re-trigger page-enter animation per route */}
          <div key={loc.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
