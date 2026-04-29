import { useEffect, useState } from "react";
import api from "../api/client";

const STATUS_STYLE = {
  pending:   "bg-yellow-900 text-yellow-300",
  confirmed: "bg-green-900  text-green-300",
  rejected:  "bg-red-900   text-red-300",
};

const STATUS_LABEL = {
  pending:   "⏳ Gözləyir",
  confirmed: "✅ Təsdiqlənib",
  rejected:  "❌ Rədd edilib",
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter]     = useState("pending");
  const [loading, setLoading]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/payments", { params: { status: filter } });
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const confirm = async (id) => {
    if (!confirm("Bu ödənişi təsdiqləmək istəyirsiniz? Plan avtomatik yüksələcək.")) return;
    try {
      await api.put(`/payments/${id}/confirm`);
      load();
      alert("✅ Ödəniş təsdiqləndi, plan yüksəldildi!");
    } catch (e) {
      alert("❌ " + (e.response?.data?.error || e.message));
    }
  };

  const reject = async (id) => {
    if (!confirm("Bu ödənişi rədd etmək istəyirsiniz?")) return;
    await api.put(`/payments/${id}/reject`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">💳 Ödənişlər</h2>
        <div className="flex gap-2">
          {["pending", "confirmed", "rejected", ""].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-sm transition ${
                filter === s ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {s === ""        ? "Hamısı" :
               s === "pending" ? "⏳ Gözləyən" :
               s === "confirmed" ? "✅ Təsdiqlənmiş" : "❌ Rədd edilmiş"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">İstifadəçi</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Məbləğ</th>
              <th className="px-4 py-3 text-left">Üsul</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Tarix</th>
              <th className="px-4 py-3 text-left">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Yüklənir...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Ödəniş tapılmadı</td></tr>
            ) : payments.map(p => (
              <tr key={p.id} className="hover:bg-gray-800/50 transition">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{p.first_name || "—"}</div>
                  <div className="text-gray-500 text-xs font-mono">{p.telegram_id}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full text-xs font-medium">
                    {p.plan_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {p.amount > 0 ? `${p.amount}$` : p.method === "stars" ? "⭐ Stars" : "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 capitalize">{p.method}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[p.status] || ""}`}>
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{p.created_at?.slice(0, 16)}</td>
                <td className="px-4 py-3">
                  {p.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirm(p.id)}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-lg transition"
                      >✅ Təsdiqlə</button>
                      <button
                        onClick={() => reject(p.id)}
                        className="bg-red-800 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-lg transition"
                      >❌ Rədd et</button>
                    </div>
                  )}
                  {p.status !== "pending" && (
                    <span className="text-gray-500 text-xs">{p.confirmed_by || "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
