import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

const PLAN_COLORS = {
  FREE:  { bar: "bg-gray-500",   badge: "bg-gray-700 text-gray-300" },
  BASIC: { bar: "bg-blue-500",   badge: "bg-blue-900 text-blue-300" },
  PRO:   { bar: "bg-yellow-500", badge: "bg-yellow-900 text-yellow-300" },
  FIRM:  { bar: "bg-purple-500", badge: "bg-purple-900 text-purple-300" },
};

function KPI({ icon, label, value, sub, trend, color = "bg-gray-900 border-gray-800" }) {
  return (
    <div className={`border rounded-2xl p-5 ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{icon}</span>
        {trend && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            trend > 0 ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"
          }`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white truncate">{value ?? <Skeleton />}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
      {sub && <div className="text-gray-500 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function Skeleton({ w = "w-20", h = "h-8" }) {
  return <div className={`${w} ${h} bg-gray-700 rounded animate-pulse inline-block`} />;
}

function MiniBar({ value, max, color = "bg-blue-500", label, tooltip }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="group relative">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-400 text-xs w-16 truncate">{label}</span>
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-gray-400 text-xs w-8 text-right">{value}</span>
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [pending,  setPending]  = useState(0);
  const [health,   setHealth]   = useState(null);
  const [revenue,  setRevenue]  = useState(null);
  const [activity, setActivity] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      api.get("/stats").then(r => setStats(r.data)),
      api.get("/payments?status=pending").then(r => setPending(r.data?.length || 0)),
      api.get("/health-check").then(r => setHealth(r.data)),
      api.get("/revenue-stats").then(r => setRevenue(r.data)),
      api.get("/user-activity").then(r => setActivity(r.data)),
      api.get("/audit-logs?limit=5").then(r => setAuditLogs(r.data?.logs || [])),
    ]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const total = stats?.totalUsers || 1;
  const mrr = revenue?.mrr || 0;
  const daily7 = revenue?.daily_30?.slice(-7) || [];
  const maxRev = Math.max(...daily7.map(d => d.revenue || 0), 1);

  const ACTION_STYLE = {
    plan_upgrade: "text-blue-400",
    payment_confirm: "text-green-400",
    user_block: "text-red-400",
    reset_queries: "text-yellow-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">📊 Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Sisteminə xoş gəldiniz</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {pending > 0 && (
            <Link to="/payments" className="flex items-center gap-2 bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-sm px-3 py-1.5 rounded-lg hover:bg-yellow-800/50 transition">
              ⏳ {pending} gözləyən ödəniş
            </Link>
          )}
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
            health?.status === "ok"
              ? "bg-green-950 border-green-800 text-green-400"
              : "bg-red-950 border-red-800 text-red-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${health?.status === "ok" ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {health?.status === "ok" ? "Sistem aktiv" : "Sistem xəta"}
            {health?.uptime && <span className="ml-1 text-gray-500">· {health.uptime}</span>}
          </div>
          {health?.response_time_ms && (
            <span className={`text-xs px-2 py-1 rounded-full border ${
              health.response_time_ms < 3000 ? "border-green-800 text-green-400" :
              health.response_time_ms < 6000 ? "border-yellow-800 text-yellow-400" :
              "border-red-800 text-red-400"
            }`}>
              {health.response_time_ms}ms
            </span>
          )}
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI icon="👥" label="Ümumi istifadəçi"    value={stats?.totalUsers}   trend={7}  sub="qeydiyyat" />
        <KPI icon="💰" label="MRR"                  value={mrr > 0 ? `$${mrr.toFixed(0)}` : "$0"} sub="aylıq gəlir" />
        <KPI icon="🟢" label="Bu gün aktiv"         value={activity?.active_24h ?? stats?.activeToday} />
        <KPI icon="⏳" label="Gözləyən ödəniş"      value={pending} color={pending > 0 ? "bg-yellow-950 border-yellow-800" : "bg-gray-900 border-gray-800"} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI icon="💳" label="Ödənişli istifadəçi"  value={stats?.paidUsers}    sub="FREE olmayan" />
        <KPI icon="📨" label="Ümumi sorğu"           value={stats?.totalQueries} sub="bütün vaxt" />
        <KPI icon="📈" label="Bu həftə yeni"         value={activity?.new_this_week} />
        <KPI icon="⚠️" label="Risk altında"          value={activity?.at_risk_count} color={activity?.at_risk_count > 0 ? "bg-red-950 border-red-900" : "bg-gray-900 border-gray-800"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue mini chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">💵 Son 7 Günlük Gəlir</h3>
            <Link to="/revenue-analytics" className="text-blue-400 hover:text-blue-300 text-xs transition">Ətraflı →</Link>
          </div>
          {loading ? (
            <div className="flex items-end gap-1 h-24">{[...Array(7)].map((_, i) => <div key={i} className="flex-1 bg-gray-700 rounded animate-pulse" style={{ height: `${20 + i * 8}px` }} />)}</div>
          ) : daily7.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">Məlumat yoxdur</div>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {daily7.map((d, i) => {
                const h = maxRev > 0 ? Math.max(4, Math.round((d.revenue / maxRev) * 88)) : 4;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full bg-blue-500/20 rounded-t group-hover:bg-blue-500/40 transition relative" style={{ height: `${h}px` }}>
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        ${d.revenue?.toFixed(2) || 0}
                      </div>
                    </div>
                    <span className="text-gray-600 text-xs">{d.date?.slice(5) || ""}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Plan distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-5">📋 Plan Bölgüsü</h3>
          <div className="space-y-3">
            {["FREE", "BASIC", "PRO", "FIRM"].map(plan => {
              const count = stats?.plans?.[plan] ?? 0;
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[plan].badge}`}>{plan}</span>
                    <span className="text-gray-400">{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${PLAN_COLORS[plan].bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4">⚡ Tez Keçidlər</h3>
          <div className="space-y-2">
            {[
              { to: "/payments",      icon: "💳", label: "Gözləyən ödənişlər",        badge: pending > 0 ? pending : null, color: "hover:bg-yellow-900/30" },
              { to: "/user-segments", icon: "⚠️", label: "Risk altındakı istifadəçilər", badge: activity?.at_risk_count || null, color: "hover:bg-red-900/30" },
              { to: "/broadcast",     icon: "📣", label: "Bütün istifadəçilərə mesaj",  color: "hover:bg-blue-900/30" },
              { to: "/revenue-analytics", icon: "💰", label: "Gəlir analitikası",      color: "hover:bg-green-900/30" },
              { to: "/bot-performance",   icon: "🤖", label: "Bot performansı",         color: "hover:bg-purple-900/30" },
            ].map(({ to, icon, label, badge, color }) => (
              <Link key={to} to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white transition-all ${color}`}>
                <span>{icon}</span>
                <span className="flex-1">{label}</span>
                {badge != null && <span className="bg-yellow-500 text-yellow-950 text-xs font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
                <span className="text-gray-600">→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent audit logs */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">📋 Son Əməliyyatlar</h3>
            <Link to="/audit-logs" className="text-blue-400 hover:text-blue-300 text-xs transition">Hamısı →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-gray-700 rounded animate-pulse" />)}</div>
          ) : auditLogs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">📭 Log tapılmadı</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 text-xs font-medium ${ACTION_STYLE[log.action] || "text-gray-400"}`}>●</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-300">{log.action?.replace(/_/g, " ")}</span>
                    <span className="text-gray-600 text-xs ml-2">{log.created_at?.slice(0, 16)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System health */}
      {health && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">🖥️ Sistem Sağlamlıq</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
            <div><div className={`text-xl ${health.database === "ok" ? "text-green-400" : "text-red-400"}`}>{health.database === "ok" ? "✅" : "❌"}</div><div className="text-gray-500 text-xs mt-1">Verilənlər bazası</div></div>
            <div><div className="text-white font-bold">{health.db_size_kb} KB</div><div className="text-gray-500 text-xs mt-1">DB ölçüsü</div></div>
            <div><div className="text-white font-bold">{health.uptime}</div><div className="text-gray-500 text-xs mt-1">Uptime</div></div>
            <div><div className="text-white font-bold text-xs">{health.timestamp?.slice(11, 19)} UTC</div><div className="text-gray-500 text-xs mt-1">Son yoxlama</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
