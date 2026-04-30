import { useEffect, useState } from "react";
import api from "../api/client";
import { toast } from "../components/Toast";
import Modal from "../components/Modal";

const PLAN_BADGE = {
  FREE:  "bg-gray-700 text-gray-300",
  BASIC: "bg-blue-800 text-blue-200",
  PRO:   "bg-yellow-800 text-yellow-200",
  FIRM:  "bg-purple-800 text-purple-200",
};

const PLANS = ["FREE", "BASIC", "PRO", "FIRM"];

export default function Users() {
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [search, setSearch]   = useState("");
  const [planFilter, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(null);
  const [modal, setModal]         = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users", {
        params: { page, limit: 20, search, plan: planFilter },
      });
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, planFilter]);
  useEffect(() => { setPage(1); load(); }, [search]);

  const upgradePlan = async (user, plan) => {
    setModal({
      title: "Plan Yüksəlt",
      message: `${user.first_name || user.telegram_id} → ${plan} planına yüksəldilsin?`,
      onConfirm: async () => {
        setModal(null);
        setUpgrading(user.id);
        try {
          await api.put(`/users/${user.id}/plan`, { plan });
          toast.success("Plan yüksəldildi!");
          load();
        } catch (e) {
          toast.error("Xəta: " + (e.response?.data?.error || e.message));
        } finally {
          setUpgrading(null);
        }
      },
    });
  };

  const toggleBlock = async (user) => {
    setModal({
      title: user.is_active ? "İstifadəçini Blokla" : "Blokdan Çıxar",
      message: `${user.first_name || user.telegram_id} ${user.is_active ? "bloklanacaq" : "blokdan çıxarılacaq"}?`,
      danger: user.is_active,
      onConfirm: async () => {
        setModal(null);
        await api.put(`/users/${user.id}/block`);
        toast.success(user.is_active ? "İstifadəçi bloklandı" : "Blok qaldırıldı");
        load();
      },
    });
  };

  const resetQueries = async (user) => {
    await api.put(`/users/${user.id}/reset-queries`);
    toast.info("Sorğular sıfırlandı");
    load();
  };

  return (
    <div>
      <Modal
        open={!!modal}
        title={modal?.title}
        message={modal?.message}
        danger={modal?.danger}
        onConfirm={modal?.onConfirm}
        onCancel={() => setModal(null)}
      />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">👥 İstifadəçilər ({total})</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="🔍 Ad, username, ID..."
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-56"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            value={planFilter}
            onChange={e => { setPlan(e.target.value); setPage(1); }}
          >
            <option value="">Bütün planlar</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">İstifadəçi</th>
              <th className="px-4 py-3 text-left">Telegram ID</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Sorğu</th>
              <th className="px-4 py-3 text-left">Qeydiyyat</th>
              <th className="px-4 py-3 text-left">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Yüklənir...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-800/50 transition">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{u.first_name || "—"}</div>
                  <div className="text-gray-500 text-xs">{u.username ? `@${u.username}` : ""}</div>
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.telegram_id}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE[u.plan_name] || ""}`}>
                    {u.plan_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">{u.queries_used}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{u.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                      defaultValue=""
                      onChange={e => { if (e.target.value) upgradePlan(u, e.target.value); e.target.value = ""; }}
                      disabled={upgrading === u.id}
                    >
                      <option value="" disabled>Plan seç</option>
                      {PLANS.filter(p => p !== u.plan_name).map(p =>
                        <option key={p} value={p}>{p}</option>
                      )}
                    </select>
                    <button
                      onClick={() => resetQueries(u)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition"
                      title="Sorğuları sıfırla"
                    >↺</button>
                    <button
                      onClick={() => toggleBlock(u)}
                      className={`text-xs transition ${u.is_active ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}`}
                    >
                      {u.is_active ? "🚫" : "✅"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 rounded text-sm transition ${
                p === page ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
