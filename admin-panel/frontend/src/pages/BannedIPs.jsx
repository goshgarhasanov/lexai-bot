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
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

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
    <div className="space-y-4">
      <Modal
        open={!!modal}
        title="IP Banını Qaldır"
        message={`${modal?.ip} IP ünvanının banı qaldırılsın?`}
        onConfirm={() => unban(modal.ip)}
        onCancel={() => setModal(null)}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🚫</span><span>Bloklanmış IP-lər</span>
            <span className="text-gray-500 text-base font-normal">({bans.length})</span>
          </h2>
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Hər 60 saniyədə avtomatik yenilənir
          </p>
        </div>
        <button
          onClick={load}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 hover:border-gray-600 text-sm px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-1.5"
        >
          <span className={loading ? "animate-spin-slow inline-block" : ""}>↺</span>
          <span className="hidden xs:inline">Yenilə</span>
        </button>
      </div>

      {loading && bans.length === 0 ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-800/60 skeleton rounded-2xl" />)}
        </div>
      ) : bans.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center animate-fade-in-up">
          <div className="text-5xl mb-3 opacity-80">✅</div>
          <p className="text-gray-300 font-medium">Hal-hazırda bloklanmış IP yoxdur</p>
          <p className="text-gray-600 text-xs mt-1">Hər şey təmizdir</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3 stagger-fast">
            {bans.map(b => (
              <div key={b.ip} className="bg-gray-900 border border-gray-800 hover:border-red-900/60 rounded-2xl p-4 transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-red-300 text-base font-medium truncate">{b.ip}</div>
                    <div className="text-gray-500 text-[11px] mt-1">
                      {b.banned_until ? new Date(b.banned_until).toLocaleString("az") : "—"}
                    </div>
                  </div>
                  <span className="bg-red-900/60 text-red-200 text-xs px-2.5 py-1 rounded-full ring-1 ring-red-700/40 shrink-0">
                    {remaining(b.banned_until)}
                  </span>
                </div>
                <button
                  onClick={() => setModal(b)}
                  className="w-full mt-3 bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 font-medium"
                >✅ Unban</button>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">IP Ünvanı</th>
                  <th className="px-4 py-3 text-left">Ban bitmə vaxtı</th>
                  <th className="px-4 py-3 text-left">Qalan müddət</th>
                  <th className="px-4 py-3 text-left">Əməliyyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/70">
                {bans.map((b, i) => (
                  <tr
                    key={b.ip}
                    className="hover:bg-gray-800/40 transition-colors duration-200 animate-fade-in"
                    style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
                  >
                    <td className="px-4 py-3 font-mono text-red-300">{b.ip}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {b.banned_until ? new Date(b.banned_until).toLocaleString("az") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-red-900/60 text-red-200 text-xs px-2.5 py-0.5 rounded-full ring-1 ring-red-700/40">
                        {remaining(b.banned_until)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModal(b)}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 shadow-sm shadow-green-900/40"
                      >✅ Unban</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-xs text-gray-500">
        <p className="flex items-center gap-2 text-gray-300">⚖️ <strong>Ban qaydaları</strong></p>
        <ul className="mt-2 space-y-1 list-disc list-inside marker:text-gray-600">
          <li>Login: 10 cəhd / 15 dəqiqə → 1 saatlıq ban</li>
          <li>API (authenticated): 120 req / dəqiqə → 1 saatlıq ban</li>
          <li>API (anonymous): 30 req / dəqiqə → 1 saatlıq ban</li>
        </ul>
      </div>
    </div>
  );
}
