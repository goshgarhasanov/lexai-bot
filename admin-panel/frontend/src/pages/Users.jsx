import { useEffect, useState, useCallback } from "react";
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

function UserDrawer({ user, onClose, onAction }) {
  const [journey, setJourney] = useState([]);
  useEffect(() => {
    if (!user) return;
    api.get(`/user-journey/${user.telegram_id}`).then(r => setJourney(r.data || [])).catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border-l border-gray-700 h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">İstifadəçi Profili</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl transition">✕</button>
        </div>
        <div className="flex-1 p-6 space-y-5">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-300">
              {(user.first_name || "?")[0].toUpperCase()}
            </div>
            <div>
              <div className="text-white font-semibold text-lg">{user.first_name || "—"}</div>
              {user.username && <div className="text-gray-400 text-sm">@{user.username}</div>}
              <div className="text-gray-500 text-xs font-mono mt-0.5">ID: {user.telegram_id}</div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Plan", value: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE[user.plan_name]}`}>{user.plan_name}</span> },
              { label: "Dil", value: (user.language || "az").toUpperCase() },
              { label: "Bu ay sorğu", value: user.queries_used },
              { label: "Status", value: user.is_active ? <span className="text-green-400">Aktiv</span> : <span className="text-red-400">Bloklu</span> },
              { label: "Qeydiyyat", value: user.created_at?.slice(0, 10) || "—" },
              { label: "Son aktiv", value: user.last_active?.slice(0, 10) || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded-xl p-3">
                <div className="text-gray-500 text-xs mb-1">{label}</div>
                <div className="text-white font-medium">{value}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="space-y-2">
            <h4 className="text-gray-400 text-xs uppercase tracking-wide">Tez Əmrlər</h4>
            <div className="flex flex-wrap gap-2">
              {PLANS.filter(p => p !== user.plan_name).map(plan => (
                <button key={plan} onClick={() => onAction("upgrade", user, plan)}
                  className="bg-blue-800 hover:bg-blue-700 text-blue-200 text-xs px-3 py-1.5 rounded-lg transition">
                  → {plan}
                </button>
              ))}
              <button onClick={() => onAction("reset", user)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition">↺ Sıfırla</button>
              <button onClick={() => onAction("block", user)}
                className={`text-xs px-3 py-1.5 rounded-lg transition ${user.is_active ? "bg-red-800 hover:bg-red-700 text-red-200" : "bg-green-800 hover:bg-green-700 text-green-200"}`}>
                {user.is_active ? "🚫 Blokla" : "✅ Açıqla"}
              </button>
            </div>
          </div>

          {/* Journey */}
          {journey.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-3">Plan Tarixi</h4>
              <div className="space-y-2">
                {journey.slice(0, 8).map((j, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div>
                      <div className="text-gray-300">{j.action?.replace(/_/g, " ")}</div>
                      <div className="text-gray-600">{j.created_at?.slice(0, 16)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [users,       setUsers]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [pages,       setPages]       = useState(1);
  const [search,      setSearch]      = useState("");
  const [planFilter,  setPlan]        = useState("");
  const [loading,     setLoading]     = useState(false);
  const [modal,       setModal]       = useState(null);
  const [selected,    setSelected]    = useState(new Set());
  const [drawer,      setDrawer]      = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minQueries: "", maxQueries: "", activeOnly: "", sort: "created_at", dir: "desc",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users", {
        params: {
          page, limit: 20, search, plan: planFilter,
          min_queries: filters.minQueries || undefined,
          max_queries: filters.maxQueries || undefined,
          is_active: filters.activeOnly || undefined,
          sort: filters.sort, dir: filters.dir,
        },
      });
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally {
      setLoading(false);
    }
  }, [page, planFilter, search, filters]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action, user, plan) => {
    if (action === "upgrade") {
      setModal({
        title: "Plan Yüksəlt",
        message: `${user.first_name || user.telegram_id} → ${plan}?`,
        onConfirm: async () => {
          setModal(null);
          try { await api.put(`/users/${user.id}/plan`, { plan }); toast.success("Plan yüksəldildi!"); load(); }
          catch (e) { toast.error(e.response?.data?.error || "Xəta"); }
        },
      });
    } else if (action === "block") {
      setModal({
        title: user.is_active ? "Blokla" : "Blokdan Çıxar",
        message: `${user.first_name || user.telegram_id} ${user.is_active ? "bloklanacaq" : "blokdan çıxarılacaq"}?`,
        danger: user.is_active,
        onConfirm: async () => {
          setModal(null);
          await api.put(`/users/${user.id}/block`);
          toast.success(user.is_active ? "Bloklandı" : "Blok qaldırıldı");
          load(); setDrawer(null);
        },
      });
    } else if (action === "reset") {
      await api.put(`/users/${user.id}/reset-queries`);
      toast.info("Sorğular sıfırlandı"); load();
    }
  };

  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(s => s.size === users.length ? new Set() : new Set(users.map(u => u.id)));

  const bulkResetQueries = async () => {
    setModal({
      title: "Toplu Sıfırlama",
      message: `${selected.size} istifadəçinin sorğuları sıfırlanacaq?`,
      onConfirm: async () => {
        setModal(null);
        await Promise.allSettled([...selected].map(id => api.put(`/users/${id}/reset-queries`)));
        toast.success(`${selected.size} istifadəçinin sorğusu sıfırlandı`);
        setSelected(new Set()); load();
      },
    });
  };

  const exportCSV = async () => {
    try {
      const resp = await api.get("/export/users", { responseType: "blob", params: { plan: planFilter, search } });
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a   = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV ixrac edildi");
    } catch { toast.error("İxrac xətası"); }
  };

  return (
    <div className="space-y-4">
      <Modal open={!!modal} title={modal?.title} message={modal?.message} danger={modal?.danger}
             onConfirm={modal?.onConfirm} onCancel={() => setModal(null)} />
      {drawer && <UserDrawer user={drawer} onClose={() => setDrawer(null)} onAction={doAction} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">👥 İstifadəçilər <span className="text-gray-500 text-lg">({total})</span></h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-3 py-2 rounded-lg transition">📥 CSV</button>
          <button onClick={() => setShowFilters(f => !f)} className={`text-sm px-3 py-2 rounded-lg transition ${showFilters ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
            ⚙️ Filterlər
          </button>
        </div>
      </div>

      {/* Search + plan filter */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="🔍 Ad, username, ID..."
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 flex-1 min-w-48"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          value={planFilter} onChange={e => { setPlan(e.target.value); setPage(1); }}>
          <option value="">Bütün planlar</option>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Extended filters */}
      {showFilters && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Min sorğu</label>
            <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              value={filters.minQueries} onChange={e => setFilters(f => ({ ...f, minQueries: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Max sorğu</label>
            <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              value={filters.maxQueries} onChange={e => setFilters(f => ({ ...f, maxQueries: e.target.value }))} placeholder="999" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              value={filters.activeOnly} onChange={e => setFilters(f => ({ ...f, activeOnly: e.target.value }))}>
              <option value="">Hamısı</option>
              <option value="true">Aktiv</option>
              <option value="false">Bloklu</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sıralama</label>
            <div className="flex gap-1">
              <select className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}>
                <option value="created_at">Qeydiyyat</option>
                <option value="queries_used">Sorğu sayı</option>
                <option value="last_active">Son aktiv</option>
              </select>
              <button onClick={() => setFilters(f => ({ ...f, dir: f.dir === "asc" ? "desc" : "asc" }))}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 rounded-lg text-sm transition">
                {filters.dir === "desc" ? "↓" : "↑"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-950 border border-blue-800 rounded-xl px-4 py-2.5">
          <span className="text-blue-300 text-sm font-medium">{selected.size} seçildi</span>
          <button onClick={bulkResetQueries} className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg transition">↺ Sorğuları sıfırla</button>
          <button onClick={() => setSelected(new Set())} className="text-blue-400 hover:text-blue-300 text-xs ml-auto transition">Seçimi ləğv et</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left w-8">
                  <input type="checkbox" className="rounded" checked={selected.size === users.length && users.length > 0}
                    onChange={selectAll} aria-label="Hamısını seç" />
                </th>
                <th className="px-4 py-3 text-left">İstifadəçi</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Telegram ID</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Sorğu</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Qeydiyyat</th>
                <th className="px-4 py-3 text-left">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-6 bg-gray-700 rounded animate-pulse" /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">📭 İstifadəçi tapılmadı</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/50 transition cursor-pointer"
                  onClick={e => { if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON") return; setDrawer(u); }}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} aria-label={`${u.first_name} seç`} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                        {(u.first_name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white">{u.first_name || "—"}</div>
                        <div className="text-gray-500 text-xs">{u.username ? `@${u.username}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">{u.telegram_id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE[u.plan_name] || ""}`}>{u.plan_name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{u.queries_used}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{u.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <select className="bg-gray-700 border border-gray-600 rounded px-1.5 py-1 text-xs text-white"
                        defaultValue="" onChange={e => { if (e.target.value) doAction("upgrade", u, e.target.value); e.target.value = ""; }}>
                        <option value="" disabled>Plan</option>
                        {PLANS.filter(p => p !== u.plan_name).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button onClick={() => doAction("reset", u)} className="text-xs text-blue-400 hover:text-blue-300 transition p-1" title="Sorğuları sıfırla" aria-label="Sorğuları sıfırla">↺</button>
                      <button onClick={() => doAction("block", u)} className={`text-xs transition p-1 ${u.is_active ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}`}
                        aria-label={u.is_active ? "Blokla" : "Blokdan çıxar"}>
                        {u.is_active ? "🚫" : "✅"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-1 flex-wrap">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 rounded text-sm bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 transition">←</button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const p = pages <= 7 ? i + 1 : (page <= 4 ? i + 1 : page - 3 + i);
            if (p < 1 || p > pages) return null;
            return <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded text-sm transition ${p === page ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{p}</button>;
          })}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1 rounded text-sm bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 transition">→</button>
        </div>
      )}
    </div>
  );
}
