import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { toast } from "../components/Toast";
import Modal from "../components/Modal";

const STATUS_STYLE = {
  pending:   "bg-yellow-900/60 text-yellow-200 ring-1 ring-yellow-700/40",
  confirmed: "bg-green-900/60 text-green-200 ring-1 ring-green-700/40",
  rejected:  "bg-red-900/60 text-red-200 ring-1 ring-red-700/40",
};
const STATUS_LABEL = {
  pending: "⏳ Gözləyir", confirmed: "✅ Təsdiqlənib", rejected: "❌ Rədd edilib",
};
const FILTERS = [
  { value: "pending",   label: "⏳ Gözləyən" },
  { value: "confirmed", label: "✅ Təsdiqlənmiş" },
  { value: "rejected",  label: "❌ Rədd edilmiş" },
  { value: "",          label: "Hamısı" },
];

function PaymentDetailModal({ p, onClose, onConfirm, onReject }) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 250); };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-250 ${closing ? "opacity-0" : "opacity-100 animate-fade-in"}`} onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl
                    ${closing ? "translate-y-4 opacity-0 transition-all duration-250" : "animate-fade-in-up sm:animate-scale-in"}`}
      >
        <div className="sm:hidden mx-auto mb-3 w-10 h-1 rounded-full bg-gray-700" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold flex items-center gap-2">💳 Ödəniş Detalları</h3>
          <button onClick={close} className="text-gray-400 hover:text-white p-2 -mr-2 rounded-lg hover:bg-gray-800 transition-all active:scale-90" aria-label="Bağla">✕</button>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ["İstifadəçi", `${p.first_name || "—"} (${p.telegram_id})`],
            ["Plan", p.plan_name],
            ["Məbləğ", p.amount > 0 ? `$${p.amount}` : "⭐ Stars"],
            ["Metod", p.method],
            ["Status", STATUS_LABEL[p.status]],
            ["Tarix", p.created_at?.slice(0, 16)],
            ["Qeyd", p.note || "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-1.5 border-b border-gray-800/60 last:border-0">
              <span className="text-gray-500">{k}</span>
              <span className="text-white font-medium text-right truncate">{v}</span>
            </div>
          ))}
        </div>
        {p.status === "pending" && (
          <div className="flex gap-2 sm:gap-3 mt-5">
            <button
              onClick={() => onConfirm(p.id)}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 shadow-md shadow-green-900/30 hover:shadow-glow-green"
            >✅ Təsdiqlə</button>
            <button
              onClick={() => onReject(p.id)}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 shadow-md shadow-red-900/30"
            >❌ Rədd et</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentCard({ p, selected, onSelect, onClick, onConfirm, onReject }) {
  return (
    <div
      onClick={onClick}
      className="group bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 cursor-pointer
                 transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        {p.status === "pending" && (
          <input
            type="checkbox"
            className="mt-1.5 rounded accent-blue-500"
            checked={selected}
            onChange={(e) => { e.stopPropagation(); onSelect(); }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white truncate">{p.first_name || "—"}</span>
            <span className="bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ring-blue-700/40">{p.plan_name}</span>
          </div>
          <div className="text-gray-500 text-xs font-mono truncate">{p.telegram_id}</div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
            <span className="text-gray-300 text-sm font-semibold tabular-nums">{p.amount > 0 ? `$${p.amount}` : "⭐"}</span>
            <span className="text-gray-500 text-[11px] capitalize">{p.method}</span>
          </div>
          <div className="text-gray-600 text-[11px] mt-1.5">{p.created_at?.slice(0, 16)}</div>
        </div>
      </div>
      {p.status === "pending" && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800/60" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onConfirm(p.id)}
            className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 font-medium"
          >✅ Təsdiqlə</button>
          <button
            onClick={() => onReject(p.id)}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 font-medium"
          >❌ Rədd et</button>
        </div>
      )}
    </div>
  );
}

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
    { icon: "💰", label: "Ümumi gəlir",  value: `$${totalRev.toFixed(0)}`,           color: "text-green-400",  bg: "from-green-950/50 to-gray-900" },
    { icon: "✅", label: "Təsdiqlənmiş", value: totals?.confirmed_count ?? "—",      color: "text-green-400",  bg: "from-green-950/30 to-gray-900" },
    { icon: "⏳", label: "Gözləyən",     value: totals?.pending_count ?? "—",        color: "text-yellow-400", bg: "from-yellow-950/40 to-gray-900" },
    { icon: "❌", label: "Rədd edilmiş", value: totals?.rejected_count ?? "—",       color: "text-red-400",    bg: "from-red-950/30 to-gray-900" },
  ];

  const pendingSelected = [...selected].filter(id => payments.find(p => p.id === id && p.status === "pending")).length;
  const allPendingIds = payments.filter(p => p.status === "pending").map(p => p.id);
  const allPendingSelected = allPendingIds.length > 0 && allPendingIds.every(id => selected.has(id));

  return (
    <div className="space-y-5">
      <Modal open={!!modal} title={modal?.title} message={modal?.message} danger={modal?.danger}
             onConfirm={modal?.onConfirm} onCancel={() => setModal(null)} />

      {detail && (
        <PaymentDetailModal p={detail} onClose={() => setDetail(null)} onConfirm={doConfirm} onReject={doReject} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>💳</span><span>Ödənişlər</span>
        </h2>
        <button
          onClick={exportCSV}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-200 text-sm px-3 py-2 rounded-lg
                     transition-all duration-200 active:scale-95 flex items-center gap-1.5"
        >
          <span>📥</span><span className="hidden xs:inline">CSV</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-fast">
        {kpiData.map(({ icon, label, value, color, bg }) => (
          <div
            key={label}
            className={`bg-gradient-to-br ${bg} border border-gray-800 rounded-2xl p-4 transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-gray-700 hover:shadow-lift`}
          >
            <div className="text-xl mb-1.5">{icon}</div>
            <div className={`text-2xl sm:text-3xl font-bold ${color} tabular-nums`}>{value}</div>
            <div className="text-gray-500 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setFilter(value); setSelected(new Set()); }}
            className={`px-3.5 py-1.5 rounded-full text-sm transition-all duration-250 active:scale-95 border
                        ${filter === value
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40"
                          : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bulk confirm */}
      {selected.size > 0 && pendingSelected > 0 && (
        <div className="flex items-center gap-3 bg-green-950/60 border border-green-800 rounded-xl px-4 py-2.5 animate-fade-in-down flex-wrap shadow-glow-green">
          <span className="text-green-200 text-sm font-medium">{pendingSelected} gözləyən seçildi</span>
          <button
            onClick={() => doConfirm(null, false)}
            className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
          >✅ Hamısını təsdiqlə</button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-green-300 hover:text-green-100 text-xs ml-auto transition-colors"
          >Ləğv et</button>
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="space-y-2">
                <div className="h-4 w-1/2 skeleton" />
                <div className="h-3 w-1/3 skeleton" />
                <div className="h-3 w-2/3 skeleton" />
              </div>
            </div>
          ))
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="text-5xl mb-3 opacity-50">📭</div>
            <p className="text-sm">Ödəniş tapılmadı</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-fast">
            {payments.map(p => (
              <PaymentCard
                key={p.id}
                p={p}
                selected={selected.has(p.id)}
                onSelect={() => setSelected(s => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                onClick={() => setDetail(p)}
                onConfirm={doConfirm}
                onReject={doReject}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    className="rounded accent-blue-500"
                    checked={allPendingSelected}
                    onChange={() => setSelected(s => allPendingSelected ? new Set() : new Set(allPendingIds))}
                    aria-label="Hamısını seç"
                  />
                </th>
                <th className="px-4 py-3 text-left">İstifadəçi</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Məbləğ</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Üsul</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Tarix</th>
                <th className="px-4 py-3 text-left">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {loading ? (
                [...Array(4)].map((_, i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-6 skeleton" /></td></tr>)
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-500">
                  <div className="text-5xl mb-3 opacity-50">📭</div>
                  <p className="text-sm">Ödəniş tapılmadı</p>
                </td></tr>
              ) : payments.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => setDetail(p)}
                  className="hover:bg-gray-800/40 transition-colors duration-200 cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {p.status === "pending" && (
                      <input
                        type="checkbox"
                        className="rounded accent-blue-500"
                        checked={selected.has(p.id)}
                        onChange={() => setSelected(s => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white truncate max-w-[160px]">{p.first_name || "—"}</div>
                    <div className="text-gray-500 text-xs font-mono">{p.telegram_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-blue-700/40">{p.plan_name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-200 tabular-nums font-medium">{p.amount > 0 ? `$${p.amount}` : "⭐"}</td>
                  <td className="px-4 py-3 text-gray-400 capitalize hidden lg:table-cell">{p.method}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[p.status] || ""}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden xl:table-cell">{p.created_at?.slice(0, 16)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {p.status === "pending" ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => doConfirm(p.id)} className="bg-green-600 hover:bg-green-500 text-white text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95 shadow-sm shadow-green-900/40">✅</button>
                        <button onClick={() => doReject(p.id)} className="bg-red-600 hover:bg-red-500 text-white text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95 shadow-sm shadow-red-900/40">❌</button>
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
