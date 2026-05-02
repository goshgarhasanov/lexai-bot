import { useEffect, useState } from "react";
import api from "../api/client";
import { toast } from "../components/Toast";

export default function SystemConfig() {
  const [configs,  setConfigs]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState({}); // key → draft value
  const [saving,   setSaving]   = useState(null);
  const [maintenance, setMaintenance] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/config");
      const arr = Array.isArray(data) ? data : (data.configs || Object.entries(data).map(([k, v]) => ({ key: k, value: v, description: "" })));
      setConfigs(arr);
      const m = arr.find(c => c.key === "maintenance_mode");
      if (m) setMaintenance(m.value === true || m.value === "true" || m.value === 1);
    } catch {
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (key, value) => setEditing(e => ({ ...e, [key]: String(value ?? "") }));
  const cancelEdit = (key) => setEditing(e => { const n = { ...e }; delete n[key]; return n; });

  const saveConfig = async (key) => {
    setSaving(key);
    try {
      await api.put(`/config/${key}`, { value: editing[key] });
      toast.success(`${key} yeniləndi`);
      cancelEdit(key);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Saxlama xətası");
    } finally {
      setSaving(null);
    }
  };

  const toggleMaintenance = async () => {
    const newVal = !maintenance;
    setSaving("maintenance_mode");
    try {
      await api.put("/config/maintenance_mode", { value: newVal });
      setMaintenance(newVal);
      toast.success(newVal ? "Maintenance mode aktiv edildi" : "Maintenance mode deaktiv edildi");
    } catch {
      toast.error("Dəyişiklik saxlanmadı");
    } finally {
      setSaving(null);
    }
  };

  const isBoolean = (v) => v === true || v === false || v === "true" || v === "false";
  const isNumber  = (v) => !isNaN(Number(v)) && v !== "" && v !== null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>⚙️</span><span>Sistem Konfiqurasiyası</span>
        </h2>
        <p className="text-gray-500 text-sm mt-1">Sistem parametrlərini idarə et</p>
      </div>

      {/* Maintenance mode - prominent */}
      <div className={`border rounded-2xl p-4 sm:p-6 transition-all duration-300 ${maintenance ? "border-red-700/60 bg-red-950/30 shadow-glow-red" : "border-gray-800 bg-gray-900 hover:border-gray-700"}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔧</span>
              <div>
                <h3 className="text-lg font-semibold text-white">Maintenance Mode</h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  {maintenance
                    ? "Aktiv — istifadəçilər bot cavabı əvəzinə texniki mesaj alır"
                    : "Deaktiv — bot normal işləyir"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={saving === "maintenance_mode"}
            aria-pressed={maintenance}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 ease-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 active:scale-95 ${
              maintenance ? "bg-red-600 focus:ring-red-500 shadow-glow-red" : "bg-gray-700 focus:ring-blue-500"
            }`}
          >
            <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-lg transform transition-transform duration-300 ease-smooth ${maintenance ? "translate-x-9" : "translate-x-1"}`} />
          </button>
        </div>
        {maintenance && (
          <div className="mt-4 bg-red-900/40 border border-red-800 rounded-xl p-3 text-red-300 text-sm">
            ⚠️ Diqqət: Bot hal-hazırda bütün sorğulara "Texniki iş aparılır" cavabı verir.
          </div>
        )}
      </div>

      {/* Config table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-700">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-800">
          <h3 className="text-sm sm:text-base font-semibold text-white">Sistem Parametrləri</h3>
          <button
            onClick={load}
            className="text-gray-400 hover:text-white text-sm p-2 rounded-lg hover:bg-gray-800 transition-all active:scale-90"
            aria-label="Yenilə"
          >
            <span className={loading ? "animate-spin-slow inline-block" : "inline-block"}>↺</span>
          </button>
        </div>

        {loading ? (
          <div className="p-4 sm:p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
        ) : configs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-5xl mb-3 opacity-60">📭</div>
            <p className="text-sm">Konfiqurasiya tapılmadı</p>
          </div>
        ) : (
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Açar</th>
                <th className="px-6 py-3 text-left">Dəyər</th>
                <th className="px-6 py-3 text-left hidden md:table-cell">Açıqlama</th>
                <th className="px-6 py-3 text-left">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {configs.map(cfg => {
                const isEditing = cfg.key in editing;
                const val = cfg.value;
                const isBool = isBoolean(val);
                return (
                  <tr key={cfg.key} className="hover:bg-gray-800/40 transition">
                    <td className="px-6 py-3 font-mono text-blue-300 text-xs">{cfg.key}</td>
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          {isBool ? (
                            <select
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                              value={editing[cfg.key]}
                              onChange={e => setEditing(ed => ({ ...ed, [cfg.key]: e.target.value }))}
                            >
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : isNumber(val) ? (
                            <input
                              type="number"
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-24"
                              value={editing[cfg.key]}
                              onChange={e => setEditing(ed => ({ ...ed, [cfg.key]: e.target.value }))}
                            />
                          ) : (
                            <input
                              type="text"
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-48"
                              value={editing[cfg.key]}
                              onChange={e => setEditing(ed => ({ ...ed, [cfg.key]: e.target.value }))}
                            />
                          )}
                        </div>
                      ) : (
                        <span className={`text-sm ${isBool ? (val === true || val === "true" ? "text-green-400" : "text-red-400") : "text-gray-300"}`}>
                          {String(val ?? "—")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs hidden md:table-cell max-w-xs truncate">{cfg.description || "—"}</td>
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => saveConfig(cfg.key)}
                            disabled={saving === cfg.key}
                            className="bg-green-600 hover:bg-green-500 text-white text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 shadow-sm shadow-green-900/40"
                            aria-label="Saxla"
                          >✓</button>
                          <button
                            onClick={() => cancelEdit(cfg.key)}
                            className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
                            aria-label="Ləğv et"
                          >✗</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(cfg.key, cfg.value)}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
                          aria-label={`${cfg.key} redaktə et`}
                        >✏️ Redaktə</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Mobile card list */}
        {!loading && configs.length > 0 && (
          <div className="md:hidden divide-y divide-gray-800/70 stagger-fast">
            {configs.map(cfg => {
              const isEditing = cfg.key in editing;
              const val = cfg.value;
              const isBool = isBoolean(val);
              return (
                <div key={cfg.key} className="p-4">
                  <div className="font-mono text-blue-300 text-xs mb-1 break-all">{cfg.key}</div>
                  {cfg.description && <div className="text-gray-500 text-[11px] mb-2">{cfg.description}</div>}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        {isBool ? (
                          <select
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                            value={editing[cfg.key]}
                            onChange={e => setEditing(ed => ({ ...ed, [cfg.key]: e.target.value }))}
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input
                            type={isNumber(val) ? "number" : "text"}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                            value={editing[cfg.key]}
                            onChange={e => setEditing(ed => ({ ...ed, [cfg.key]: e.target.value }))}
                          />
                        )}
                        <button
                          onClick={() => saveConfig(cfg.key)}
                          disabled={saving === cfg.key}
                          className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                        >✓</button>
                        <button
                          onClick={() => cancelEdit(cfg.key)}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-3 py-1.5 rounded-lg transition-all active:scale-95"
                        >✗</button>
                      </>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm font-mono break-all ${isBool ? (val === true || val === "true" ? "text-green-400" : "text-red-400") : "text-gray-200"}`}>
                          {String(val ?? "—")}
                        </span>
                        <button
                          onClick={() => startEdit(cfg.key, cfg.value)}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-3 py-1.5 rounded-lg transition-all active:scale-95 shrink-0"
                        >✏️</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
