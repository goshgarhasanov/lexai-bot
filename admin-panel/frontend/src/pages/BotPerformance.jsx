import { useEffect, useState } from "react";
import api from "../api/client";

function LatencyBadge({ label, value }) {
  const color = value == null ? "border-gray-700 text-gray-500"
    : value < 3000  ? "border-green-700 bg-green-950/40 text-green-400"
    : value < 6000  ? "border-yellow-700 bg-yellow-950/40 text-yellow-400"
    : "border-red-700 bg-red-950/40 text-red-400";
  return (
    <div className={`border rounded-xl p-4 text-center ${color}`}>
      <div className="text-2xl font-bold">{value != null ? `${(value / 1000).toFixed(2)}s` : "—"}</div>
      <div className="text-xs mt-1 opacity-70">{label}</div>
    </div>
  );
}

const HOUR_LABELS = ["00","02","04","06","08","10","12","14","16","18","20","22"];

export default function BotPerformance() {
  const [perf,   setPerf]   = useState(null);
  const [topics, setTopics] = useState([]);
  const [qstats, setQstats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get("/bot-performance").then(r => setPerf(r.data)),
      api.get("/popular-topics").then(r => setTopics(r.data?.topics || r.data || [])),
      api.get("/query-stats").then(r => setQstats(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const hourly = perf?.hourly_heatmap || qstats?.today?.hourly || [];
  const maxHourly = Math.max(...hourly.map(h => h.count || 0), 1);
  const modelUsage = perf?.model_usage || qstats?.model_usage || {};
  const totalModel = Object.values(modelUsage).reduce((a, b) => a + b, 0) || 1;

  const MODEL_COLORS = { claude: "bg-blue-500", gemini: "bg-green-500", gpt: "bg-yellow-500" };

  const topicsList = topics.length > 0 ? topics : (qstats?.popular_categories || []);
  const maxTopics = Math.max(...topicsList.map(t => t.count || 0), 1);

  const CATEGORY_LABELS = {
    simple_definition: "Termin izahı",
    deep_legal_analysis: "Dərin analiz",
    document_drafting: "Sənəd hazırlama",
    case_research: "Presedent axtarışı",
    quick_check: "Tez yoxlama",
    sentiment_crisis: "Kriz dəstəyi",
    labour_law: "Əmək hüququ",
    family_law: "Ailə hüququ",
    civil_law: "Mülki hüquq",
    criminal_law: "Cinayət hüququ",
    property_law: "Torpaq hüququ",
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">🤖 Bot Performansı</h2>

      {/* Latency */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-4">⏱ Cavab Vaxtı (Latency)</h3>
        <div className="grid grid-cols-3 gap-4">
          <LatencyBadge label="P50 (Median)" value={perf?.p50_ms ?? qstats?.today?.avg_response_ms} />
          <LatencyBadge label="P95" value={perf?.p95_ms} />
          <LatencyBadge label="P99" value={perf?.p99_ms} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="text-white font-bold">{qstats?.today?.total ?? "—"}</div>
            <div className="text-gray-500 text-xs mt-1">Bugün sorğu</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="text-white font-bold">{qstats?.week?.total ?? "—"}</div>
            <div className="text-gray-500 text-xs mt-1">Bu həftə</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3">
            <div className={`font-bold ${perf?.error_rate > 5 ? "text-red-400" : "text-green-400"}`}>
              {perf?.error_rate != null ? `${perf.error_rate}%` : "—"}
            </div>
            <div className="text-gray-500 text-xs mt-1">Xəta nisbəti</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly heatmap */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4">🕐 24 Saatlıq Aktivlik Xəritəsi</h3>
          {loading ? (
            <div className="grid grid-cols-12 gap-1">{[...Array(24)].map((_, i) => <div key={i} className="h-8 bg-gray-700 rounded animate-pulse" />)}</div>
          ) : hourly.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Məlumat yoxdur</p>
          ) : (
            <div>
              <div className="grid grid-cols-12 gap-1 mb-1">
                {Array.from({ length: 24 }, (_, h) => {
                  const entry = hourly.find(e => (e.hour ?? e.h) === h);
                  const count = entry?.count || 0;
                  const intensity = maxHourly > 0 ? count / maxHourly : 0;
                  const bg = intensity === 0 ? "bg-gray-800"
                    : intensity < 0.25 ? "bg-blue-900"
                    : intensity < 0.5  ? "bg-blue-700"
                    : intensity < 0.75 ? "bg-blue-500"
                    : "bg-blue-300";
                  return (
                    <div key={h} className={`${bg} rounded h-8 flex items-center justify-center group relative cursor-default`}>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {h}:00 — {count} sorğu
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-12 gap-1 text-gray-600 text-xs">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-center">{h % 4 === 0 ? h : ""}</div>
                ))}
              </div>
              {perf?.peak_hour != null && (
                <p className="text-gray-400 text-xs mt-3">Peak saat: <span className="text-white">{perf.peak_hour}:00</span></p>
              )}
            </div>
          )}
        </div>

        {/* AI model usage */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4">🧠 AI Model İstifadəsi</h3>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-700 rounded animate-pulse" />)}</div>
          ) : Object.keys(modelUsage).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Məlumat yoxdur</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(modelUsage).map(([model, count]) => {
                const pct = Math.round((count / totalModel) * 100);
                return (
                  <div key={model}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-300 capitalize">{model}</span>
                      <span className="text-gray-400">{count} sorğu · {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${MODEL_COLORS[model.toLowerCase()] || "bg-gray-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {perf?.rag_hit_rate != null && (
            <div className="mt-5 pt-4 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">RAG hit rate</span>
                <span className={`font-medium ${perf.rag_hit_rate > 70 ? "text-green-400" : "text-yellow-400"}`}>{perf.rag_hit_rate}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popular topics */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-5">📚 Ən Populyar Mövzular (Son 7 Gün)</h3>
        {loading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-8 bg-gray-700 rounded animate-pulse" />)}</div>
        ) : topicsList.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">📭 Məlumat yoxdur</p>
        ) : (
          <div className="space-y-3">
            {topicsList.slice(0, 10).map((t, i) => {
              const label = CATEGORY_LABELS[t.category || t.topic] || (t.category || t.topic || "Digər");
              const count = t.count || 0;
              const pct = Math.round((count / maxTopics) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs w-4 text-right">{i + 1}</span>
                  <span className="text-gray-300 text-sm w-40 truncate">{label}</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-gray-400 text-xs w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
