import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { toast } from "../components/Toast";
import Modal from "../components/Modal";

const STATUS_STYLE = {
  pending:   "bg-yellow-900 text-yellow-300",
  confirmed: "bg-green-900 text-green-300",
  rejected:  "bg-red-900 text-red-300",
};
const STATUS_LABEL = {
  pending: "⏳ Gözləyir", confirmed: "✅ Təsdiqlənib", rejected: "❌ Rədd edilib",
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [filter,   setFilter]   = useState("pending");
  const [loading,  setLoading]  = useState(false);
  const [stats,    setStats]    = useState(null);
  const [modal,    setModal]    = useState(null);
  const [detail,   setDetail]   = useState(null);
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.allSettled([
        api.get("/payments", { params: { status: filter } }),
        api.get("/payment-stats"),
      ]);
      setPayments(pRes.status === "fulfilled" ? pRes.value.data : []);
      setStats(sRes.status === "fulfilled" ? sRes.value.data : null);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const doConfirm = (id, single = true) => {
    setModal({
      title: "Ödənişi Təsdiqlə",
      message: single ? "Bu ödəniş təsdiqlənəcək, plan avtomatik yüksələcək." : `${selected.size} ödəniş təsdiqlənəcək.`,
      onConfirm: async () => {
        setModal(null); setDetail(null);
        const ids = single ? [id] : [...selected].filter(i => payments.find(p => p.id === i && p.status === "pending"));
        try {
          await Promise.allSettled(ids.map(i => api.put(`/payments/${i}/confirm`)));
          toast.success(single ? "Ödəniş təsdiqləndi!" : `${ids.length} ödəniş təsdiqləndi!`);
          setSelected(new Set()); load();
        } catch (e) { toast.error(e.response?.data?.error || "Xəta"); }
      },
    });
  };

  const doReject = (id) => {
    setModal({
      title: "Ödənişi Rədd Et",
      message: "Bu ödəniş rədd ediləcək.",
      danger: true,
      onConfirm: async () => {
        setModal(null); setDetail(null);
        await api.put(`/payments/${id}/reject`);
        toast.info("Ödəniş rədd edildi"); load();
      },
    });
  };

  const exportCSV = async () => {
    try {
      const resp = await api.get("/export/payments", { responseType: "blob", params: { status: filter } });
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a"); a.href = url; a.download = "payments.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV ixrac edildi");
    } catch { toast.error("İxrac xətası"); }
  };

  const totals = stats?.totals;
  const totalRev = totals?.total_revenue || 0;

  const kpiData = [
    { label: "Ümumi gəlir", value: `$${totalRev.toFixed(2)}`, color: "text-green-400" },
    { label: "Təsdiqlənmiş", value: totals?.confirmed_count ?? "—", color: "text-green-400" },
    { label: "Gözləyən", value: totals?.pending_count ?? "—", color: "text-yellow-400" },
    { label: "Rədd edilmiş", value: totals?.rejected_count ?? "—", color: "text-red-400" },
  ];

  const pendingSelected = [...selected].filter(id => payments.find(p => p.id === id && p.status === "pending")).length;

  return (
    <div className="space-y-5">
      <Modal open={!!modal} title={modal?.title} message={modal?.message} danger={modal?.danger}
             onConfirm={modal?.onConfirm} onCancel={() => setModal(null)} />

      {/* Payment detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Ödəniş Detalları</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["İstifadəçi", `${detail.first_name || "—"} (${detail.telegram_id})`],
                ["Plan", detail.plan_name],
                ["Məbləğ", detail.amount > 0 ? `$${detail.amount}` : "⭐ Stars"],
                ["Metod", detail.method],
                ["Status", STATUS_LABEL[detail.status]],
                ["Tarix", detail.created_at?.slice(0, 16)],
                ["Qeyd", detail.note || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
            {detail.status === "pending" && (
              <div className="flex gap-3 mt-5">
                <button onClick={() => doConfirm(detail.id)}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded-lg text-sm transition">✅ Təsdiqlə</button>
                <button onClick={() => doReject(detail.id)}
                  className="flex-1 bg-red-800 hover:bg-red-700 text-white py-2 rounded-lg text-sm transition">❌ Rədd et</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">💳 Ödənişlər</h2>
        <button onClick={exportCSV} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-3 py-2 rounded-lg transition">📥 CSV</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpiData.map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-gray-500 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["pending", "confirmed", "rejected", ""].map(s => (
          <button key={s} onClick={() => { setFilter(s); setSelected(new Set()); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === s ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {s === "" ? "Hamısı" : s === "pending" ? "⏳ Gözləyən" : s === "confirmed" ? "✅ Təsdiqlənmiş" : "❌ Rədd edilmiş"}
          </button>
        ))}
      </div>

      {/* Bulk confirm */}
      {selected.size > 0 && pendingSelected > 0 && (
        <div className="flex items-center gap-3 bg-green-950 border border-green-800 rounded-xl px-4 py-2.5">
          <span className="text-green-300 text-sm">{pendingSelected} gözləyən seçildi</span>
          <button onClick={() => doConfirm(null, false)}
            className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition">✅ Hamısını təsdiqlə</button>
          <button onClick={() => setSelected(new Set())} className="text-green-400 text-xs ml-auto">Ləğv et</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left w-8">
                  <input type="checkbox" className="rounded"
                    checked={selected.size === payments.filter(p => p.status === "pending").length && payments.some(p => p.status === "pending")}
                    onChange={() => {
                      const pending = payments.filter(p => p.status === "pending").map(p => p.id);
                      setSelected(s => s.size === pending.length ? new Set() : new Set(pending));
                    }} />
                </th>
                <th className="px-4 py-3 text-left">İstifadəçi</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Məbləğ</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Üsul</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Tarix</th>
                <th className="px-4 py-3 text-left">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                [...Array(4)].map((_, i) => <tr key={i}><td colSpan={8}><div className="h-12 bg-gray-700 animate-pulse mx-4 my-2 rounded" /></td></tr>)
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">📭 Ödəniş tapılmadı</td></tr>
              ) : payments.map(p => (
                <tr key={p.id} onClick={() => setDetail(p)} className="hover:bg-gray-800/50 transition cursor-pointer">
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {p.status === "pending" && (
                      <input type="checkbox" className="rounded" checked={selected.has(p.id)}
                        onChange={() => setSelected(s => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{p.first_name || "—"}</div>
                    <div className="text-gray-500 text-xs font-mono">{p.telegram_id}</div>
                  </td>
                  <td className="px-4 py-3"><span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full text-xs font-medium">{p.plan_name}</span></td>
                  <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">{p.amount > 0 ? `$${p.amount}` : "⭐"}</td>
                  <td className="px-4 py-3 text-gray-400 capitalize hidden md:table-cell">{p.method}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[p.status] || ""}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">{p.created_at?.slice(0, 16)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {p.status === "pending" ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => doConfirm(p.id)} className="bg-green-700 hover:bg-green-600 text-white text-xs px-2.5 py-1 rounded-lg transition">✅</button>
                        <button onClick={() => doReject(p.id)} className="bg-red-800 hover:bg-red-700 text-white text-xs px-2.5 py-1 rounded-lg transition">❌</button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">{p.confirmed_by || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
