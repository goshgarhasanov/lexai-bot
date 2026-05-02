import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { toast } from "../components/Toast";
import Modal from "../components/Modal";

const STATUS_STYLE = {
  DRAFT:   { badge: "bg-yellow-900 text-yellow-300", icon: "📝" },
  SENDING: { badge: "bg-blue-900 text-blue-300",     icon: "📤" },
  SENT:    { badge: "bg-green-900 text-green-300",   icon: "✅" },
  FAILED:  { badge: "bg-red-900 text-red-300",       icon: "❌" },
};

export default function Broadcast() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [sending,    setSending]    = useState(null);
  const [modal,      setModal]      = useState(null);

  const [form, setForm] = useState({
    title: "", message: "", target_plan: "ALL", target_language: "ALL",
  });

  const estimatedReach = useCallback(() => {
    if (!stats) return "—";
    if (form.target_plan === "ALL") return stats.totalUsers ?? "—";
    return stats.plans?.[form.target_plan] ?? 0;
  }, [stats, form.target_plan]);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/broadcast");
      setBroadcasts(Array.isArray(data) ? data : data.broadcasts || []);
    } catch {
      setBroadcasts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
    api.get("/stats").then(r => setStats(r.data)).catch(() => {});
  }, []);

  const createBroadcast = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { toast.error("Mesaj boş ola bilməz"); return; }
    try {
      await api.post("/broadcast", form);
      toast.success("Broadcast yaradıldı!");
      setForm({ title: "", message: "", target_plan: "ALL", target_language: "ALL" });
      loadBroadcasts();
    } catch (e) {
      toast.error(e.response?.data?.error || "Xəta baş verdi");
    }
  };

  const sendBroadcast = (bc) => {
    setModal({
      title: "Broadcast Göndər",
      message: `"${bc.title || "Mesaj"}" yayımlanacaq — ${estimatedReach()} istifadəçiyə çatacaq. Davam edilsin?`,
      onConfirm: async () => {
        setModal(null);
        setSending(bc.id);
        try {
          await api.post(`/broadcast/${bc.id}/send`);
          toast.success("Broadcast göndərildi!");
          loadBroadcasts();
        } catch (e) {
          toast.error(e.response?.data?.error || "Göndərmə xətası");
        } finally {
          setSending(null);
        }
      },
    });
  };

  const deleteBroadcast = (bc) => {
    setModal({
      title: "Broadcast Sil",
      message: `"${bc.title || "Mesaj"}" silinəcək. Davam edilsin?`,
      danger: true,
      onConfirm: async () => {
        setModal(null);
        try {
          await api.delete(`/broadcast/${bc.id}`);
          toast.success("Silindi");
          loadBroadcasts();
        } catch {
          toast.error("Silmə xətası");
        }
      },
    });
  };

  const remaining = 500 - form.message.length;

  return (
    <div className="space-y-6">
      <Modal open={!!modal} title={modal?.title} message={modal?.message} danger={modal?.danger}
             onConfirm={modal?.onConfirm} onCancel={() => setModal(null)} />

      <div>
        <h2 className="text-2xl font-bold text-white">📣 Broadcast</h2>
        <p className="text-gray-500 text-sm mt-1">İstifadəçilərə kütləvi mesaj göndər</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-5">✍️ Yeni Broadcast</h3>
          <form onSubmit={createBroadcast} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Başlıq</label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                placeholder="Mesaj başlığı..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm text-gray-400">Mesaj</label>
                <span className={`text-xs ${remaining < 50 ? "text-red-400" : "text-gray-500"}`}>{remaining} simvol qalıb</span>
              </div>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition resize-none"
                rows={5}
                maxLength={500}
                placeholder="İstifadəçilərə göndəriləcək mesaj..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Hədəf plan</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={form.target_plan}
                  onChange={e => setForm(f => ({ ...f, target_plan: e.target.value }))}
                >
                  {["ALL", "FREE", "BASIC", "PRO", "FIRM"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Hədəf dil</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={form.target_language}
                  onChange={e => setForm(f => ({ ...f, target_language: e.target.value }))}
                >
                  {["ALL", "AZ", "RU", "EN"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <div className="text-white font-semibold">{estimatedReach()} istifadəçi</div>
                <div className="text-gray-500 text-xs">Tahmini çatacaq</div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              📣 Broadcast Yarat
            </button>
          </form>
        </div>

        {/* Broadcast list */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">📋 Broadcast Siyahısı</h3>
            <button onClick={loadBroadcasts} className="text-gray-400 hover:text-white text-sm transition">↺</button>
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-700 animate-pulse rounded-xl" />)}</div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500">Hələ broadcast yoxdur</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {broadcasts.map(bc => {
                const style = STATUS_STYLE[bc.status] || STATUS_STYLE.DRAFT;
                return (
                  <div key={bc.id} className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{bc.title || "Başlıqsız"}</div>
                        <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">{bc.message}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${style.badge}`}>
                        {style.icon} {bc.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-500 text-xs">
                        {bc.target_plan} · {bc.target_language}
                        {bc.sent_count != null && ` · ${bc.sent_count} göndərildi`}
                        {bc.failed_count > 0 && ` · ${bc.failed_count} uğursuz`}
                      </div>
                      <div className="flex gap-2">
                        {bc.status === "DRAFT" && (
                          <button
                            onClick={() => sendBroadcast(bc)}
                            disabled={sending === bc.id}
                            className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                          >
                            {sending === bc.id ? "⏳" : "📤 Göndər"}
                          </button>
                        )}
                        {["DRAFT", "FAILED"].includes(bc.status) && (
                          <button
                            onClick={() => deleteBroadcast(bc)}
                            className="bg-red-800 hover:bg-red-700 text-white text-xs px-2.5 py-1 rounded-lg transition"
                          >🗑</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
