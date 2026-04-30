import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { toast } from "../components/Toast";
import Modal from "../components/Modal";

export default function BannedIPs() {
  const [bans, setBans]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(null);
  const [now, setNow]         = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/banned");
      setBans(data || []);
    } catch {
      setBans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const unban = async (ip) => {
    try {
      await api.delete(`/admin/ban/${encodeURIComponent(ip)}`);
      toast.success(`${ip} ban siyahısından çıxarıldı`);
      load();
    } catch {
      toast.error("Unban uğursuz oldu");
    }
    setModal(null);
  };

  const remaining = (until) => {
    const diff = new Date(until).getTime() - now;
    if (diff <= 0) return "Bitib";
    const m = Math.ceil(diff / 60000);
    return m >= 60 ? `${Math.floor(m / 60)}s ${m % 60}d` : `${m} dəq`;
  };

  return (
    <div>
      <Modal
        open={!!modal}
        title="IP Banını Qaldır"
        message={`${modal?.ip} IP ünvanının banı qaldırılsın?`}
        onConfirm={() => unban(modal.ip)}
        onCancel={() => setModal(null)}
      />

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">🚫 Bloklanmış IP-lər</h2>
          <p className="text-gray-500 text-sm mt-1">Hər 60 saniyə avtomatik yenilənir</p>
        </div>
        <button
          onClick={load}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition"
        >↺ Yenilə</button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 bg-gray-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : bans.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-400">Hal-hazırda bloklanmış IP yoxdur</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">IP Ünvanı</th>
                <th className="px-4 py-3 text-left">Ban bitmə vaxtı</th>
                <th className="px-4 py-3 text-left">Qalan müddət</th>
                <th className="px-4 py-3 text-left">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {bans.map(b => (
                <tr key={b.ip} className="hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3 font-mono text-red-400">{b.ip}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {b.banned_until ? new Date(b.banned_until).toLocaleString("az") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-red-900 text-red-300 text-xs px-2 py-0.5 rounded-full">
                      {remaining(b.banned_until)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModal(b)}
                      className="bg-green-800 hover:bg-green-700 text-green-200 text-xs px-3 py-1.5 rounded-lg transition"
                    >✅ Unban</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-500">
        <p>⚖️ <strong className="text-gray-400">Ban qaydaları:</strong></p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>Login: 10 cəhd / 15 dəqiqə → 1 saatlıq ban</li>
          <li>API (authenticated): 120 req / dəqiqə → 1 saatlıq ban</li>
          <li>API (anonymous): 30 req / dəqiqə → 1 saatlıq ban</li>
        </ul>
      </div>
    </div>
  );
}
