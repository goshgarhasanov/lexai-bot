import { useEffect, useState, useCallback } from "react";
import api from "../api/client";

const ACTION_STYLE = {
  plan_upgrade:      { color: "bg-blue-900 text-blue-300",   icon: "⬆️" },
  user_block:        { color: "bg-red-900 text-red-300",     icon: "🚫" },
  user_unblock:      { color: "bg-green-900 text-green-300", icon: "✅" },
  payment_confirm:   { color: "bg-green-900 text-green-300", icon: "💰" },
  payment_reject:    { color: "bg-red-900 text-red-300",     icon: "❌" },
  reset_queries:     { color: "bg-yellow-900 text-yellow-300", icon: "↺" },
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

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const parseDetails = (raw) => {
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(" · ");
    } catch {
      return raw || "—";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">📋 Audit Logları</h2>
        <div className="flex items-center gap-3">
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {ALL_ACTIONS.map(a => (
              <option key={a} value={a}>{a ? (ACTION_LABELS[a] || a) : "Bütün əməliyyatlar"}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-3 py-2 rounded-lg transition"
          >↺ Yenilə</button>
          <span className="text-gray-500 text-xs">Hər 30s avtomatik yenilənir</span>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Tarix</th>
              <th className="px-4 py-3 text-left">Əməliyyat</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Hədəf ID</th>
              <th className="px-4 py-3 text-left">Detallar</th>
              <th className="px-4 py-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Yüklənir...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Log tapılmadı</td></tr>
            ) : logs.map(log => {
              const style = ACTION_STYLE[log.action] || { color: "bg-gray-800 text-gray-300", icon: "•" };
              return (
                <tr key={log.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{log.created_at?.slice(0, 16) || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style.color}`}>
                      {style.icon} {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{log.admin_user || "admin"}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.target_user_id || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate" title={log.details}>
                    {parseDetails(log.details)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.ip_address || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 30 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 text-sm">← Əvvəl</button>
          <span className="px-3 py-1 text-gray-400 text-sm">Səhifə {page}</span>
          <button onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 text-sm">Sonra →</button>
        </div>
      )}
    </div>
  );
}
