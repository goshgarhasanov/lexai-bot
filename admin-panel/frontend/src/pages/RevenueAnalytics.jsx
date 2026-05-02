import { useEffect, useState } from "react";
import api from "../api/client";

function KPI({ icon, label, value, sub, color = "from-gray-900 to-gray-900" }) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-gray-800 rounded-2xl p-4 sm:p-5 transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-gray-700 hover:shadow-lift`}>
      {icon && <div className="text-xl mb-1.5">{icon}</div>}
      <div className="text-2xl sm:text-3xl font-bold text-white truncate tabular-nums">{value ?? <div className="h-8 w-20 skeleton rounded inline-block" />}</div>
      <div className="text-gray-400 text-xs sm:text-sm mt-1">{label}</div>
      {sub && <div className="text-gray-500 text-[11px] mt-0.5">{sub}</div>}
    </div>
  );
}

const PLAN_COLORS = { FREE: "bg-gray-500", BASIC: "bg-blue-500", PRO: "bg-yellow-500", FIRM: "bg-purple-500" };
const PLAN_BADGES = { FREE: "bg-gray-700 text-gray-300", BASIC: "bg-blue-900 text-blue-300", PRO: "bg-yellow-900 text-yellow-300", FIRM: "bg-purple-900 text-purple-300" };

export default function RevenueAnalytics() {
  const [fin,    setFin]    = useState(null);
  const [churn,  setChurn]  = useState(null);
  const [pstats, setPstats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get("/financial-dashboard").then(r => setFin(r.data)),
      api.get("/churn-analysis").then(r => setChurn(r.data)),
      api.get("/payment-stats").then(r => setPstats(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const daily30 = fin?.daily_30 || [];
  const maxRev  = Math.max(...daily30.map(d => d.revenue || 0), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span>💰</span><span>Gəlir Analitikası</span>
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-fast">
        <KPI icon="💸" label="MRR"          value={fin?.mrr != null ? `$${fin.mrr.toFixed(0)}` : null} sub="Aylıq daimi gəlir" color="from-blue-950/50 to-gray-900" />
        <KPI icon="📈" label="ARR"          value={fin?.arr != null ? `$${fin.arr.toFixed(0)}` : null} sub="İllik proyeksiya" color="from-green-950/40 to-gray-900" />
        <KPI icon="💰" label="Ümumi Gəlir"  value={fin?.total_revenue != null ? `$${fin.total_revenue.toFixed(0)}` : null} sub="Bütün vaxt" color="from-yellow-950/40 to-gray-900" />
        <KPI icon="👤" label="ARPU"         value={fin?.arpu != null ? `$${fin.arpu.toFixed(2)}` : null} sub="İstifadəçi başına" color="from-purple-950/40 to-gray-900" />
      </div>

      {/* Revenue trend bar chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:border-gray-700">
        <h3 className="text-sm sm:text-base font-semibold text-white mb-4 sm:mb-5 flex items-center gap-2">📅 Son 30 Günlük Gəlir Trendi</h3>
        {loading ? (
          <div className="flex items-end gap-0.5 h-32">{[...Array(30)].map((_, i) => <div key={i} className="flex-1 skeleton rounded-t" style={{ height: `${15 + Math.random() * 70}px` }} />)}</div>
        ) : daily30.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">📭 Məlumat yoxdur</p>
        ) : (
          <div className="flex items-end gap-0.5 h-32" role="img" aria-label="Gəlir trendi">
            {daily30.map((d, i) => {
              const h = Math.max(2, Math.round(((d.revenue || 0) / maxRev) * 120));
              return (
                <div key={i} className="flex-1 flex flex-col items-center group">
                  <div
                    className="w-full rounded-t transition-all duration-500 ease-smooth cursor-pointer relative hover:opacity-90"
                    style={{
                      height: `${h}px`,
                      background: d.revenue > 0 ? "linear-gradient(to top, #2563eb, #60a5fa)" : "#374151",
                      animationDelay: `${i * 15}ms`,
                      animation: "fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
                    }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-700 text-white text-[11px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none shadow-lg">
                      {d.date?.slice(5)}: ${(d.revenue || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-between text-gray-600 text-xs mt-2">
          <span>{daily30[0]?.date?.slice(5) || ""}</span>
          <span>{daily30[daily30.length - 1]?.date?.slice(5) || ""}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Plan breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:border-gray-700">
          <h3 className="text-base font-semibold text-white mb-5">📊 Plana Görə Bölgü</h3>
          {loading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-gray-700 rounded animate-pulse" />)}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2 pr-4">Plan</th>
                    <th className="text-right py-2 pr-4">Ödəniş</th>
                    <th className="text-right py-2 pr-4">Gəlir</th>
                    <th className="text-right py-2">Faiz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(pstats?.by_plan || []).map(p => {
                    const total = pstats?.totals?.total_revenue || 1;
                    const pct = total > 0 ? ((p.revenue / total) * 100).toFixed(1) : "0";
                    return (
                      <tr key={p.plan_name}>
                        <td className="py-2.5 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGES[p.plan_name] || ""}`}>{p.plan_name}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-300">{p.count}</td>
                        <td className="py-2.5 pr-4 text-right text-white font-medium">${(p.revenue || 0).toFixed(2)}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-full ${PLAN_COLORS[p.plan_name] || "bg-gray-500"} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-gray-400 text-xs w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!pstats?.by_plan || pstats.by_plan.length === 0) && (
                    <tr><td colSpan={4} className="text-center py-6 text-gray-500">Məlumat yoxdur</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Churn */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:border-gray-700">
          <h3 className="text-base font-semibold text-white mb-5">📉 Churn Analizi</h3>
          {loading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-700 rounded animate-pulse" />)}</div> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-950/50 border border-red-900 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{churn?.churn_count ?? 0}</div>
                  <div className="text-gray-400 text-xs mt-1">Bu ay çıxış</div>
                </div>
                <div className="bg-orange-950/50 border border-orange-900 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">{churn?.churn_rate != null ? `${churn.churn_rate}%` : "0%"}</div>
                  <div className="text-gray-400 text-xs mt-1">Churn rate</div>
                </div>
              </div>
              <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-4">
                <div className="text-sm font-medium text-yellow-300 mb-2">⚠️ Risk altındakılar</div>
                <div className="text-2xl font-bold text-white">{churn?.at_risk_count ?? 0}</div>
                <div className="text-gray-500 text-xs mt-1">14+ gündür aktiv deyil (ödənişli plan)</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Orta müştəri ömrü</div>
                <div className="text-xl font-bold text-white">{churn?.avg_lifetime_days != null ? `${churn.avg_lifetime_days} gün` : "—"}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment totals */}
      {pstats?.totals && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Ödəniş Xülasəsi</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: "Ümumi ödəniş", value: pstats.totals.total_count },
              { label: "Təsdiqlənmiş", value: pstats.totals.confirmed_count, color: "text-green-400" },
              { label: "Gözləyən", value: pstats.totals.pending_count, color: "text-yellow-400" },
              { label: "Rədd edilmiş", value: pstats.totals.rejected_count, color: "text-red-400" },
            ].map(({ label, value, color = "text-white" }) => (
              <div key={label}>
                <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>
                <div className="text-gray-500 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
