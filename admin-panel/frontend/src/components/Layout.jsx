import { NavLink, Outlet, useNavigate } from "react-router-dom";

const links = [
  { to: "/dashboard", icon: "📊", label: "Dashboard" },
  { to: "/users",     icon: "👥", label: "İstifadəçilər" },
  { to: "/payments",  icon: "💳", label: "Ödənişlər" },
];

export default function Layout() {
  const nav = useNavigate();
  const logout = () => { localStorage.removeItem("token"); nav("/login"); };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-6 py-6 border-b border-gray-800">
          <div className="text-2xl mb-1">⚖️</div>
          <h1 className="text-white font-bold text-lg leading-tight">HuquqAI</h1>
          <p className="text-gray-500 text-xs">Admin Panel</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition"
          >
            🚪 Çıxış
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-gray-950 p-8">
        <Outlet />
      </main>
    </div>
  );
}
