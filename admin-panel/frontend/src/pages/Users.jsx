import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { toast } from "../components/Toast";
import Modal from "../components/Modal";

const PLAN_BADGE = {
  FREE:  "bg-gray-700/70 text-gray-300 ring-1 ring-gray-600/40",
  BASIC: "bg-blue-800/70 text-blue-200 ring-1 ring-blue-600/40",
  PRO:   "bg-yellow-800/70 text-yellow-200 ring-1 ring-yellow-600/40",
  FIRM:  "bg-purple-800/70 text-purple-200 ring-1 ring-purple-600/40",
};
const PLANS = ["FREE", "BASIC", "PRO", "FIRM"];

function UserDrawer({ user, onClose, onAction }) {
  const [journey, setJourney] = useState([]);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get(`/user-journey/${user.telegram_id}`).then(r => setJourney(r.data || [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 300);
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-emph
                    ${closing ? "opacity-0" : "opacity-100 animate-fade-in"}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full sm:max-w-md bg-gray-900 sm:border-l border-gray-700 h-full overflow-y-auto shadow-2xl flex flex-col
                    transition-transform duration-350 ease-smooth
                    ${closing ? "translate-x-full" : "translate-x-0 animate-drawer-in"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 glass-strong flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold flex items-center gap-2">👤 İstifadəçi Profili</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-2 -mr-2 rounded-lg hover:bg-gray-800 transition-all duration-200 active:scale-90"
            aria-label="Bağla"
          >✕</button>
        </div>
        <div className="flex-1 p-5 sm:p-6 space-y-5 stagger-fast">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-900/40 shrink-0">
              {(user.first_name || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-lg truncate">{user.first_name || "—"}</div>
              {user.username && <div className="text-gray-400 text-sm truncate">@{user.username}</div>}
              <div className="text-gray-500 text-xs font-mono mt-0.5 truncate">ID: {user.telegram_id}</div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2.5 text-sm">
            {[
              { label: "Plan",          value: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE[user.plan_name]}`}>{user.plan_name}</span> },
              { label: "Dil",           value: (user.language || "az").toUpperCase() },
              { label: "Bu ay sorğu",   value: user.queries_used },
              { label: "Status",        value: user.is_active ? <span className="text-green-400">Aktiv</span> : <span className="text-red-400">Bloklu</span> },
              { label: "Qeydiyyat",     value: user.created_at?.slice(0, 10) || "—" },
              { label: "Son aktiv",     value: user.last_active?.slice(0, 10) || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800/70 hover:bg-gray-800 transition-colors duration-200 rounded-xl p-3 border border-gray-800">
                <div className="text-gray-500 text-[11px] uppercase tracking-wide mb-1">{label}</div>
                <div className="text-white font-medium text-sm">{value}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="space-y-2">
            <h4 className="text-gray-400 text-[11px] uppercase tracking-wide font-semibold">Tez Əmrlər</h4>
            <div className="flex flex-wrap gap-2">
              {PLANS.filter(p => p !== user.plan_name).map(plan => (
                <button
                  key={plan}
                  onClick={() => onAction("upgrade", user, plan)}
                  className="bg-blue-800/80 hover:bg-blue-700 text-blue-100 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 hover:shadow-glow-blue"
                >
                  → {plan}
                </button>
              ))}
              <button
                onClick={() => onAction("reset", user)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
              >↺ Sıfırla</button>
              <button
                onClick={() => onAction("block", user)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 ${
                  user.is_active
                    ? "bg-red-800/80 hover:bg-red-700 text-red-100 hover:shadow-glow-red"
                    : "bg-green-800/80 hover:bg-green-700 text-green-100 hover:shadow-glow-green"
                }`}
              >
                {user.is_active ? "🚫 Blokla" : "✅ Açıqla"}
              </button>
            </div>
          </div>

          {/* Journey */}
          {journey.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-[11px] uppercase tracking-wide font-semibold mb-3">Plan Tarixi</h4>
              <div className="space-y-2 relative pl-4 border-l border-gray-800">
                {journey.slice(0, 8).map((j, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs relative">
                    <span className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-gray-900" />
                    <div className="min-w-0 flex-1">
                      <div className="text-gray-300 truncate">{j.action?.replace(/_/g, " ")}</div>
                      <div className="text-gray-600 text-[11px]">{j.created_at?.slice(0, 16)}</div>
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

function UserCard({ u, selected, onSelect, onClick, onAction }) {
  return (
    <div
      onClick={onClick}
      className="group bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 cursor-pointer
                 transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1.5 rounded accent-blue-500"
          checked={selected}
          onChange={(e) => { e.stopPropagation(); onSelect(); }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`${u.first_name} seç`}
        />
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md shadow-blue-900/30">
          {(u.first_name || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white truncate">{u.first_name || "—"}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PLAN_BADGE[u.plan_name] || ""}`}>{u.plan_name}</span>
            {!u.is_active && <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-900/60 text-red-300">Bloklu</span>}
          </div>
          {u.username && <div className="text-gray-500 text-xs truncate">@{u.username}</div>}
          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1.5 flex-wrap">
            <span className="font-mono">ID: {u.telegram_id}</span>
            <span>·</span>
            <span>{u.queries_used} sorğu</span>
            {u.created_at && (<><span>·</span><span>{u.created_at.slice(0, 10)}</span></>)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800/60" onClick={(e) => e.stopPropagation()}>
        <select
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
          defaultValue=""
          onChange={(e) => { if (e.target.value) onAction("upgrade", u, e.target.value); e.target.value = ""; }}
        >
          <option value="" disabled>Plan dəyiş</option>
          {PLANS.filter(p => p !== u.plan_name).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          onClick={() => onAction("reset", u)}
          className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/50 p-2 rounded-lg transition-all duration-200 active:scale-90"
          aria-label="Sorğuları sıfırla"
          title="Sorğuları sıfırla"
        >↺</button>
        <button
          onClick={() => onAction("block", u)}
          className={`p-2 rounded-lg transition-all duration-200 active:scale-90 ${
            u.is_active ? "text-red-400 hover:text-red-300 hover:bg-red-950/50" : "text-green-400 hover:text-green-300 hover:bg-green-950/50"
          }`}
          aria-label={u.is_active ? "Blokla" : "Blokdan çıxar"}
        >{u.is_active ? "🚫" : "✅"}</button>
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

  // Debounce search
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

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

  const bulkResetQueries = () => {
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
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>👥</span>
          <span>İstifadəçilər</span>
          <span className="text-gray-500 text-base font-normal">({total})</span>
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-200 text-sm px-3 py-2 rounded-lg
                       transition-all duration-200 active:scale-95 flex items-center gap-1.5"
          >
            <span>📥</span><span className="hidden xs:inline">CSV</span>
          </button>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`text-sm px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-1.5 border
                        ${showFilters ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40" : "bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"}`}
          >
            <span>⚙️</span><span className="hidden xs:inline">Filterlər</span>
          </button>
        </div>
      </div>

      {/* Search + plan filter */}
      <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Ad, username, ID..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500
                       focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all duration-200"
          value={planFilter}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
        >
          <option value="">Bütün planlar</option>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Extended filters */}
      {showFilters && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-down">
          <div>
            <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wide">Min sorğu</label>
            <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              value={filters.minQueries} onChange={e => setFilters(f => ({ ...f, minQueries: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wide">Max sorğu</label>
            <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              value={filters.maxQueries} onChange={e => setFilters(f => ({ ...f, maxQueries: e.target.value }))} placeholder="999" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wide">Status</label>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              value={filters.activeOnly} onChange={e => setFilters(f => ({ ...f, activeOnly: e.target.value }))}>
              <option value="">Hamısı</option>
              <option value="true">Aktiv</option>
              <option value="false">Bloklu</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wide">Sıralama</label>
            <div className="flex gap-1">
              <select className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}>
                <option value="created_at">Qeydiyyat</option>
                <option value="queries_used">Sorğu sayı</option>
                <option value="last_active">Son aktiv</option>
              </select>
              <button
                onClick={() => setFilters(f => ({ ...f, dir: f.dir === "asc" ? "desc" : "asc" }))}
                className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-2.5 rounded-lg text-sm transition-all duration-200 active:scale-90"
                aria-label="Sıralama yönü"
              >
                <span className={`inline-block transition-transform duration-300 ${filters.dir === "desc" ? "rotate-0" : "rotate-180"}`}>↓</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-950/60 border border-blue-800 rounded-xl px-4 py-2.5 animate-fade-in-down flex-wrap shadow-glow-blue">
          <span className="text-blue-200 text-sm font-medium">{selected.size} seçildi</span>
          <button
            onClick={bulkResetQueries}
            className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
          >↺ Sorğuları sıfırla</button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-blue-300 hover:text-blue-100 text-xs ml-auto transition-colors"
          >Seçimi ləğv et</button>
        </div>
      )}

      {/* Mobile cards (md altı) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 skeleton" />
                  <div className="h-2 w-1/3 skeleton" />
                  <div className="h-2 w-2/3 skeleton" />
                </div>
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="text-5xl mb-3 opacity-50">📭</div>
            <p className="text-sm">İstifadəçi tapılmadı</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-fast">
            {users.map(u => (
              <UserCard
                key={u.id}
                u={u}
                selected={selected.has(u.id)}
                onSelect={() => toggleSelect(u.id)}
                onClick={() => setDrawer(u)}
                onAction={doAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop table (md+) */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left w-8">
                  <input type="checkbox" className="rounded accent-blue-500" checked={selected.size === users.length && users.length > 0}
                    onChange={selectAll} aria-label="Hamısını seç" />
                </th>
                <th className="px-4 py-3 text-left">İstifadəçi</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Telegram ID</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Sorğu</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Qeydiyyat</th>
                <th className="px-4 py-3 text-left">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-6 skeleton" /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-500">
                  <div className="text-5xl mb-3 opacity-50">📭</div>
                  <p className="text-sm">İstifadəçi tapılmadı</p>
                </td></tr>
              ) : users.map((u, i) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-800/40 transition-colors duration-200 cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
                  onClick={e => { if (["INPUT", "SELECT", "BUTTON"].includes(e.target.tagName)) return; setDrawer(u); }}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded accent-blue-500" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} aria-label={`${u.first_name} seç`} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md shadow-blue-900/30">
                        {(u.first_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate max-w-[180px]">{u.first_name || "—"}</div>
                        <div className="text-gray-500 text-xs truncate">{u.username ? `@${u.username}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden lg:table-cell">{u.telegram_id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE[u.plan_name] || ""}`}>{u.plan_name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-200 tabular-nums">{u.queries_used}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden xl:table-cell">{u.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <select className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                        defaultValue="" onChange={e => { if (e.target.value) doAction("upgrade", u, e.target.value); e.target.value = ""; }}>
                        <option value="" disabled>Plan</option>
                        {PLANS.filter(p => p !== u.plan_name).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button onClick={() => doAction("reset", u)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/50 transition-all p-1.5 rounded active:scale-90" title="Sorğuları sıfırla" aria-label="Sorğuları sıfırla">↺</button>
                      <button onClick={() => doAction("block", u)} className={`transition-all p-1.5 rounded active:scale-90 ${u.is_active ? "text-red-400 hover:text-red-300 hover:bg-red-950/50" : "text-green-400 hover:text-green-300 hover:bg-green-950/50"}`}
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
        <div className="flex justify-center gap-1 flex-wrap pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-40 disabled:pointer-events-none
                       transition-all duration-200 active:scale-95"
          >←</button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const p = pages <= 7 ? i + 1 : (page <= 4 ? i + 1 : page - 3 + i);
            if (p < 1 || p > pages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 active:scale-95 border min-w-[36px] tabular-nums
                            ${p === page
                              ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40"
                              : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"}`}
              >{p}</button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-40 disabled:pointer-events-none
                       transition-all duration-200 active:scale-95"
          >→</button>
        </div>
      )}
    </div>
  );
}
