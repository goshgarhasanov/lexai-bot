import { useEffect, useState, useCallback } from "react";
import api from "../api/client";

const ACTION_STYLE = {
  plan_upgrade:    { color: "bg-blue-900/60 text-blue-200 ring-1 ring-blue-700/40",     icon: "⬆️" },
  user_block:      { color: "bg-red-900/60 text-red-200 ring-1 ring-red-700/40",        icon: "🚫" },
  user_unblock:    { color: "bg-green-900/60 text-green-200 ring-1 ring-green-700/40",  icon: "✅" },
  payment_confirm: { color: "bg-green-900/60 text-green-200 ring-1 ring-green-700/40",  icon: "💰" },
  payment_reject:  { color: "bg-red-900/60 text-red-200 ring-1 ring-red-700/40",        icon: "❌" },
  reset_queries:   { color: "bg-yellow-900/60 text-yellow-200 ring-1 ring-yellow-700/40", icon: "↺" },
};

const ACTION_LABELS = {
  plan_upgrade:    "Plan yüksəldildi",
  user_block:      "İstifadəçi bloklandı",
  user_unblock:    "İstifadəçi blokdan çıxarıldı",
  payment_confirm: "Ödəniş təsdiqləndi",
  payment_reject:  "Ödəniş rədd edildi",
  reset_queries:   "Sorğular sıfırlandı",
};

const ALL_ACTIONS = ["", "plan_upgrade", "user_block", "user_unblock", "payment_confirm", "payment_reject", "reset_queries"];

const parseDetails = (raw) => {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(" · ");
  } catch {
    return raw || "—";
  }
};

export default function AuditLog() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction]   = useState("");
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/audit-logs", { params: { page, limit: 30, action } });
      setLogs(data.logs || data || []);
      setTotal(data.total || (data?.logs?.length ?? 0));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, action]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📋</span><span>Audit Logları</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
          >
            {ALL_ACTIONS.map(a => (
              <option key={a} value={a}>{a ? (ACTION_LABELS[a] || a) : "Bütün əməliyyatlar"}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 hover:border-gray-600 text-sm px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-1.5"
          >
            <span className={loading ? "animate-spin-slow inline-block" : "inline-block"}>↺</span>
            <span className="hidden xs:inline">Yenilə</span>
          </button>
        </div>
      </div>

      <div className="text-gray-500 text-[11px] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Hər 30 saniyədə avtomatik yenilənir
      </div>

      {/* Mobile: timeline cards */}
      <div className="md:hidden">
        {loading && logs.length === 0 ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="space-y-2">
                  <div className="h-3 w-1/3 skeleton" />
                  <div className="h-4 w-1/2 skeleton" />
                  <div className="h-3 w-2/3 skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="text-5xl mb-3 opacity-50">📭</div>
            <p className="text-sm">Log tapılmadı</p>
          </div>
        ) : (
          <div className="relative pl-5 border-l border-gray-800 space-y-3 stagger-fast">
            {logs.map(log => {
              const style = ACTION_STYLE[log.action] || { color: "bg-gray-800 text-gray-300", icon: "•" };
              return (
                <div key={log.id} className="relative">
                  <span className={`absolute -left-[27px] top-3 w-3 h-3 rounded-full ring-2 ring-gray-950 ${style.color.split(" ")[0].replace("/60", "")}`} />
                  <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition-all duration-300 ease-smooth hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.color}`}>
                        {style.icon} {ACTION_LABELS[log.action] || log.action}
                      </span>
                      <span className="text-gray-500 text-[11px] tabular-nums">{log.created_at?.slice(0, 16) || "—"}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 space-y-1">
                      <div><span className="text-gray-500">Admin:</span> <span className="text-gray-200">{log.admin_user || "admin"}</span></div>
                      {log.target_user_id && (
                        <div><span className="text-gray-500">Hədəf:</span> <span className="font-mono text-gray-300">{log.target_user_id}</span></div>
                      )}
                      {log.details && (
                        <div className="text-gray-500 text-[11px] truncate" title={log.details}>{parseDetails(log.details)}</div>
                      )}
                      {log.ip_address && (
                        <div className="text-gray-600 text-[11px] font-mono">{log.ip_address}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Tarix</th>
                <th className="px-4 py-3 text-left">Əməliyyat</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Admin</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Hədəf ID</th>
                <th className="px-4 py-3 text-left">Detallar</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {loading && logs.length === 0 ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-6 skeleton" /></td></tr>)
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-500">
                  <div className="text-5xl mb-3 opacity-50">📭</div>
                  <p className="text-sm">Log tapılmadı</p>
                </td></tr>
              ) : logs.map((log, i) => {
                const style = ACTION_STYLE[log.action] || { color: "bg-gray-800 text-gray-300", icon: "•" };
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-800/40 transition-colors duration-200 animate-fade-in"
                    style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap tabular-nums">{log.created_at?.slice(0, 16) || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.color}`}>
                        {style.icon} {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">{log.admin_user || "admin"}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden xl:table-cell">{log.target_user_id || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate" title={log.details}>
                      {parseDetails(log.details)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono hidden xl:table-cell">{log.ip_address || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {total > 30 && (
        <div className="flex justify-center gap-1.5 pt-2 flex-wrap">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-40 disabled:pointer-events-none text-sm transition-all duration-200 active:scale-95"
          >← Əvvəl</button>
          <span className="px-3 py-1.5 text-gray-400 text-sm tabular-nums">Səhifə {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-sm transition-all duration-200 active:scale-95"
          >Sonra →</button>
        </div>
      )}
    </div>
  );
}
