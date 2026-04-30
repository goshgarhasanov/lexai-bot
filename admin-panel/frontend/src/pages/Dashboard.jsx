import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

const PLAN_COLORS = {
  FREE:  "bg-gray-700 text-gray-300",
  BASIC: "bg-blue-900 text-blue-300",
  PRO:   "bg-yellow-900 text-yellow-300",
  FIRM:  "bg-purple-900 text-purple-300",
};

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`border rounded-2xl p-5 ${color || "bg-gray-900 border-gray-800"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value ?? <span className="animate-pulse bg-gray-700 rounded w-16 h-8 block" />}</div>
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function MiniBar({ pct, color = "bg-blue-500" }) {
  return (
    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [pending, setPending] = useState(0);
  const [recent,  setRecent]  = useState([]);
  const [health,  setHealth]  = useState(null);

  useEffect(() => {
    api.get("/stats").then(r => setStats(r.data)).catch(() => {});
    api.get("/payments?status=pending").then(r => setPending(r.data?.length || 0)).catch(() => {});
    api.get("/users?limit=5").then(r => setRecent(r.data?.users || [])).catch(() => {});
    api.get("/health-check").then(r => setHealth(r.data)).catch(() => {});
  }, []);

  const total = stats?.totalUsers || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">📊 Dashboard</h2>
        <div className="flex items-center gap-3">
          {pending > 0 && (
            <Link to="/payments" className="flex items-center gap-2 bg-yellow-900/60 border border-yellow-700 text-yellow-300 text-sm px-3 py-1.5 rounded-lg hover:bg-yellow-800/60 transition">
              ⏳ {pending} gözləyən ödəniş
            </Link>
          )}
          {health && (
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              health.status === "ok"
                ? "bg-green-950 border-green-800 text-green-400"
                : "bg-red-950 border-red-800 text-red-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health.status === "ok" ? "bg-green-400" : "bg-red-400"}`} />
              {health.status === "ok" ? "Sistem aktiv" : "Sistem xəta"}
            </span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Ümumi istifadəçi"    value={stats?.totalUsers}   sub="qeydiyyat" />
        <StatCard icon="🆕" label="Bu gün qeydiyyat"    value={stats?.activeToday}  />
        <StatCard icon="💰" label="Ödənişli istifadəçi" value={stats?.paidUsers}    sub="FREE olmayan" />
        <StatCard icon="📨" label="Ümumi sorğu"         value={stats?.totalQueries} sub="bütün vaxt" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan bölgüsü */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-5">📋 Plan bölgüsü</h3>
          <div className="space-y-4">
            {["FREE", "BASIC", "PRO", "FIRM"].map(plan => {
              const count = stats?.plans?.[plan] ?? 0;
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[plan]}`}>{plan}</span>
                    <span className="text-gray-400">{count} istifadəçi · {pct}%</span>
                  </div>
                  <MiniBar pct={pct} color={
                    plan === "FREE" ? "bg-gray-500" :
                    plan === "BASIC" ? "bg-blue-500" :
                    plan === "PRO" ? "bg-yellow-500" : "bg-purple-500"
                  } />
                </div>
              );
            })}
          </div>
        </div>

        {/* Son qeydiyyatlar */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">🆕 Son Qeydiyyatlar</h3>
            <Link to="/users" className="text-blue-400 hover:text-blue-300 text-xs transition">Hamısı →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Məlumat yüklənir...</p>
          ) : (
            <div className="space-y-3">
              {recent.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                    {(u.first_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{u.first_name || "—"}</div>
                    <div className="text-xs text-gray-500">{u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${PLAN_COLORS[u.plan_name] || ""}`}>
                    {u.plan_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sistem sağlamlıq */}
      {health && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white mb-4">🖥️ Sistem Sağlamlıq</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className={`text-lg font-bold ${health.database === "ok" ? "text-green-400" : "text-red-400"}`}>
                {health.database === "ok" ? "✅" : "❌"}
              </div>
              <div className="text-gray-400 text-xs mt-1">Verilənlər bazası</div>
            </div>
            <div>
              <div className="text-white font-bold">{health.db_size_kb} KB</div>
              <div className="text-gray-400 text-xs mt-1">DB ölçüsü</div>
            </div>
            <div>
              <div className="text-white font-bold">{health.uptime}</div>
              <div className="text-gray-400 text-xs mt-1">Uptime</div>
            </div>
            <div>
              <div className="text-white font-bold text-xs">{health.timestamp?.slice(11, 19)} UTC</div>
              <div className="text-gray-400 text-xs mt-1">Son yoxlama</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
