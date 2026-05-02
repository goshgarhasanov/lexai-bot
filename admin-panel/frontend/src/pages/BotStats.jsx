import { useEffect, useState } from "react";
import api from "../api/client";

function MiniBar({ value, max, color = "bg-blue-500" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700 ease-smooth`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-10 text-right tabular-nums shrink-0">{value}</span>
    </div>
  );
}

function Section({ title, children, loading }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:border-gray-700">
      <h3 className="text-sm sm:text-base font-semibold text-white mb-4">{title}</h3>
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-6 skeleton rounded" />)}</div>
      ) : children}
    </div>
  );
}

const LANG_LABELS = { az: "🇦🇿 Azərbaycan", ru: "🇷🇺 Rus", en: "🇬🇧 İngilis" };
const LANG_COLORS = { az: "bg-blue-500", ru: "bg-red-500", en: "bg-green-500" };

const PLAN_COLORS = {
  FREE: "bg-gray-600", BASIC: "bg-blue-600", PRO: "bg-yellow-500", FIRM: "bg-purple-600",
};

export default function BotStats() {
  const [data, setData]   = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/bot-stats").catch(() => ({ data: null })),
      api.get("/stats").catch(() => ({ data: null })),
    ]).then(([botRes, statsRes]) => {
      setData(botRes.data);
      setStats(statsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const daily      = data?.daily_active || [];
  const top10      = data?.top_users    || [];
  const langDist   = data?.languages || data?.lang_dist || {};
  const monthly    = data?.monthly_registrations || [];
  const totalUsers = stats?.totalUsers  || 1;
  const paidUsers  = stats?.paidUsers   || 0;
  const convRate   = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : "0";

  const maxDaily   = Math.max(...daily.map(d => d.count || 0), 1);
  const maxMonthly = Math.max(...monthly.map(m => m.count || 0), 1);
  const totalLang  = Object.values(langDist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span>📈</span><span>Bot Statistikası</span>
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-fast">
        {[
          { icon: "👥", label: "Ümumi istifadəçi",    val: stats?.totalUsers,   bg: "from-blue-950/40 to-gray-900" },
          { icon: "💰", label: "Ödənişli istifadəçi", val: stats?.paidUsers,    bg: "from-green-950/40 to-gray-900" },
          { icon: "📨", label: "Ümumi sorğu",         val: stats?.totalQueries, bg: "from-purple-950/40 to-gray-900" },
          { icon: "📊", label: "Konversiya nisbəti",  val: `${convRate}%`,      bg: "from-yellow-950/40 to-gray-900" },
        ].map(({ icon, label, val, bg }) => (
          <div
            key={label}
            className={`bg-gradient-to-br ${bg} border border-gray-800 rounded-2xl p-4 sm:p-5 transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-gray-700 hover:shadow-lift`}
          >
            <div className="text-xl mb-1.5">{icon}</div>
            <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{val ?? "—"}</div>
            <div className="text-gray-500 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Daily active - last 7 days */}
        <Section title="📅 Son 7 Günlük Aktiv İstifadəçi" loading={loading}>
          {daily.length === 0 ? (
            <p className="text-gray-500 text-sm">Məlumat yoxdur</p>
          ) : (
            <div className="space-y-2">
              {daily.slice(-7).map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{d.date || `Gün ${i + 1}`}</span>
                  </div>
                  <MiniBar value={d.count || 0} max={maxDaily} color="bg-blue-500" />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Monthly registrations */}
        <Section title="📆 Aylıq Qeydiyyat (Son 6 Ay)" loading={loading}>
          {monthly.length === 0 ? (
            <p className="text-gray-500 text-sm">Məlumat yoxdur</p>
          ) : (
            <div className="space-y-2">
              {monthly.map((m, i) => (
                <div key={i}>
                  <div className="text-xs text-gray-400 mb-1">{m.month || `Ay ${i + 1}`}</div>
                  <MiniBar value={m.count || 0} max={maxMonthly} color="bg-green-500" />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Language distribution */}
        <Section title="🌐 Dil Bölgüsü" loading={loading}>
          {Object.keys(langDist).length === 0 ? (
            <p className="text-gray-500 text-sm">Məlumat yoxdur</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(langDist).map(([lang, count]) => (
                <div key={lang}>
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>{LANG_LABELS[lang] || lang.toUpperCase()}</span>
                    <span>{((count / totalLang) * 100).toFixed(1)}%</span>
                  </div>
                  <MiniBar value={count} max={totalLang} color={LANG_COLORS[lang] || "bg-gray-500"} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Plan distribution */}
        <Section title="💼 Plan Bölgüsü & Konversiya" loading={loading}>
          <div className="space-y-3">
            {["FREE", "BASIC", "PRO", "FIRM"].map(plan => {
              const count = stats?.plans?.[plan] || 0;
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>{plan}</span>
                    <span>{count} istifadəçi</span>
                  </div>
                  <MiniBar value={count} max={totalUsers} color={PLAN_COLORS[plan]} />
                </div>
              );
            })}
            <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
              FREE → Ödənişli konversiya: <span className="text-green-400 font-semibold">{convRate}%</span>
            </div>
          </div>
        </Section>
      </div>

      {/* Top 10 users */}
      <Section title="🏆 Ən Aktiv 10 İstifadəçi" loading={loading}>
        {top10.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">📭 Məlumat yoxdur</p>
        ) : (
          <>
            {/* Mobile compact list */}
            <div className="md:hidden space-y-2 stagger-fast">
              {top10.map((u, i) => (
                <div key={u.telegram_id} className="flex items-center gap-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl p-3 transition-all duration-200">
                  <span className="text-gray-500 text-xs tabular-nums w-5 shrink-0">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(u.first_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm truncate">{u.first_name || "—"}</div>
                    <div className="text-gray-500 text-xs truncate">{u.username ? `@${u.username}` : u.telegram_id}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${PLAN_COLORS[u.plan_name]} text-white block mb-0.5`}>{u.plan_name}</span>
                    <span className="text-gray-300 text-xs tabular-nums font-mono">{u.queries_used}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left py-2 px-3">#</th>
                    <th className="text-left py-2 px-3">İstifadəçi</th>
                    <th className="text-left py-2 px-3">Plan</th>
                    <th className="text-left py-2 px-3">Sorğu</th>
                    <th className="text-left py-2 px-3">Son aktiv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/70">
                  {top10.map((u, i) => (
                    <tr
                      key={u.telegram_id}
                      className="hover:bg-gray-800/40 transition-colors duration-200 animate-fade-in"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="py-2.5 px-3 text-gray-500 tabular-nums">{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-white">{u.first_name || "—"}</div>
                        <div className="text-gray-500 text-xs">{u.username ? `@${u.username}` : u.telegram_id}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${PLAN_COLORS[u.plan_name]} text-white`}>{u.plan_name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-300 font-mono tabular-nums">{u.queries_used}</td>
                      <td className="py-2.5 px-3 text-gray-400 text-xs">{u.last_active?.slice(0, 10) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
