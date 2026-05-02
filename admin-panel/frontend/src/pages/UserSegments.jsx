import { useEffect, useState } from "react";
import api from "../api/client";
import { toast } from "../components/Toast";
import Modal from "../components/Modal";

const SEGMENTS = [
  { key: "power_users",     icon: "💪", label: "Power Users",           color: "border-blue-700 bg-blue-950/30",    badge: "bg-blue-800 text-blue-200" },
  { key: "at_risk",         icon: "⚠️", label: "Risk Altında",          color: "border-red-700 bg-red-950/30",      badge: "bg-red-800 text-red-200" },
  { key: "new_this_week",   icon: "🆕", label: "Bu Həftə Qeydiyyat",    color: "border-green-700 bg-green-950/30",  badge: "bg-green-800 text-green-200" },
  { key: "expiring_soon",   icon: "⏰", label: "Abunəlik Bitəcək",      color: "border-yellow-700 bg-yellow-950/30", badge: "bg-yellow-800 text-yellow-200" },
  { key: "never_queried",   icon: "😴", label: "Heç Sual Sormayan",     color: "border-gray-600 bg-gray-800/30",    badge: "bg-gray-700 text-gray-300" },
  { key: "high_value",      icon: "💎", label: "Yüksək Dəyərli",        color: "border-purple-700 bg-purple-950/30", badge: "bg-purple-800 text-purple-200" },
];

const PLAN_BADGE = {
  FREE: "bg-gray-700 text-gray-300", BASIC: "bg-blue-800 text-blue-200",
  PRO: "bg-yellow-800 text-yellow-200", FIRM: "bg-purple-800 text-purple-200",
};

export default function UserSegments() {
  const [data,     setData]     = useState({});
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [modal,    setModal]    = useState(null);

  useEffect(() => {
    api.get("/user-segments")
      .then(r => setData(r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    setLoading(true);
    api.get("/user-segments").then(r => setData(r.data || {})).finally(() => setLoading(false));
  };

  const upgradePlan = (user, plan) => {
    setModal({
      title: "Plan Yüksəlt",
      message: `${user.first_name || user.telegram_id} → ${plan} planına yüksəldilsin?`,
      onConfirm: async () => {
        setModal(null);
        try {
          await api.put(`/users/${user.id}/plan`, { plan });
          toast.success("Plan yüksəldildi!");
          reload();
        } catch (e) {
          toast.error(e.response?.data?.error || "Xəta");
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><span>🎯</span><span>İstifadəçi Seqmentləri</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Modal open={!!modal} title={modal?.title} message={modal?.message} onConfirm={modal?.onConfirm} onCancel={() => setModal(null)} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎯</span><span>İstifadəçi Seqmentləri</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">İstifadəçiləri davranışa görə qruplara ayır</p>
        </div>
        <button
          onClick={reload}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 hover:border-gray-600 text-sm px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-1.5"
        >
          <span className={loading ? "animate-spin-slow inline-block" : "inline-block"}>↺</span>
          <span className="hidden xs:inline">Yenilə</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger-fast">
        {SEGMENTS.map(seg => {
          const segment = data[seg.key] || {};
          const users = segment.users || [];
          const count = segment.count || users.length || 0;
          const isOpen = expanded === seg.key;

          return (
            <div key={seg.key} className={`border rounded-2xl overflow-hidden transition-all duration-300 ease-smooth hover:shadow-lift ${seg.color} ${isOpen ? "" : "hover:-translate-y-0.5"}`}>
              <button
                className="w-full p-4 sm:p-5 flex items-center gap-4 hover:bg-white/5 transition-colors duration-200 text-left active:scale-[0.99]"
                onClick={() => setExpanded(isOpen ? null : seg.key)}
                aria-expanded={isOpen}
              >
                <span className="text-2xl shrink-0 transition-transform duration-300 ease-spring group-hover:scale-110">{seg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{seg.label}</div>
                  <div className="text-gray-400 text-xs mt-0.5 truncate">{segment.description || ""}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-lg font-bold px-2.5 py-0.5 rounded-full tabular-nums ${seg.badge}`}>{count}</span>
                  <div className={`text-gray-500 text-xs mt-0.5 transition-transform duration-300 inline-block ${isOpen ? "rotate-180" : ""}`}>▼</div>
                </div>
              </button>

              <div className={`grid transition-[grid-template-rows] duration-350 ease-smooth ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="border-t border-gray-700/50 max-h-64 overflow-y-auto">
                    {users.length === 0 ? (
                      <div className="text-gray-500 text-sm text-center py-6">📭 Bu seqmentdə istifadəçi yoxdur</div>
                    ) : users.map(u => (
                      <div key={u.id || u.telegram_id} className="flex items-center gap-2.5 px-4 sm:px-5 py-3 hover:bg-white/5 transition-colors duration-200 border-b border-gray-700/30 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-200 shrink-0">
                          {(u.first_name || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{u.first_name || "—"}</div>
                          <div className="text-xs text-gray-500">{u.queries_used} sorğu</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${PLAN_BADGE[u.plan_name] || ""}`}>{u.plan_name}</span>
                        <select
                          className="bg-gray-700 border border-gray-600 rounded-md px-1.5 py-1 text-xs text-white shrink-0 focus:outline-none focus:border-blue-500 transition-colors"
                          defaultValue=""
                          onChange={e => { if (e.target.value) upgradePlan(u, e.target.value); e.target.value = ""; }}
                        >
                          <option value="" disabled>Plan</option>
                          {["FREE", "BASIC", "PRO", "FIRM"].filter(p => p !== u.plan_name).map(p =>
                            <option key={p} value={p}>{p}</option>
                          )}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
