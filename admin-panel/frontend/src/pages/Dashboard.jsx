import { useEffect, useState } from "react";
import api from "../api/client";

const PLAN_COLORS = {
  FREE:  "bg-gray-700 text-gray-300",
  BASIC: "bg-blue-900 text-blue-300",
  PRO:   "bg-yellow-900 text-yellow-300",
  FIRM:  "bg-purple-900 text-purple-300",
};

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value ?? "—"}</div>
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stats").then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">📊 Dashboard</h2>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👥" label="Ümumi istifadəçi"  value={stats?.totalUsers}   sub="qeydiyyat" />
        <StatCard icon="🆕" label="Bu gün qeydiyyat"  value={stats?.activeToday}  />
        <StatCard icon="💰" label="Ödənişli istifadəçi" value={stats?.paidUsers}  sub="FREE olmayan" />
        <StatCard icon="📨" label="Ümumi sorğu"        value={stats?.totalQueries} sub="bütün vaxt" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-5">📋 Plan bölgüsü</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["FREE", "BASIC", "PRO", "FIRM"].map(plan => (
            <div key={plan} className={`rounded-xl p-4 text-center ${PLAN_COLORS[plan]}`}>
              <div className="text-2xl font-bold">{stats?.plans?.[plan] ?? 0}</div>
              <div className="text-sm mt-1 opacity-80">{plan}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
