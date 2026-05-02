import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { encryptPayload } from "../api/crypto";

export default function Login() {
  const [form, setForm]       = useState({ username: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [banned, setBanned]   = useState(null); // { retry_after_minutes, banned_until }
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (banned) return;
    setLoading(true);
    setError("");

    try {
      // AES-GCM ilə şifrələ
      const encrypted = await encryptPayload({
        username: form.username.trim(),
        password: form.password,
      });

      const { data } = await axios.post("/api/auth/login", encrypted, {
        headers: { "Content-Type": "application/json" },
      });

      localStorage.setItem("token", data.token);
      nav("/dashboard");

    } catch (err) {
      const res = err.response;
      if (res?.status === 429) {
        setBanned(res.data);
        setError(
          `⛔ Çox sayda uğursuz cəhd. IP ${res.data.retry_after_minutes} dəqiqəliyə bloklandı.`
        );
      } else {
        setError(res?.data?.error || "Giriş uğursuz oldu");
      }
    } finally {
      setLoading(false);
    }
  };

  const retryMinutes = banned?.retry_after_minutes;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚖️</div>
          <h1 className="text-2xl font-bold text-white">HuquqAI</h1>
          <p className="text-gray-400 text-sm mt-1">Admin Panel</p>
        </div>

        {/* Ban xəbərdarlığı */}
        {banned && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-4 text-center">
            <div className="text-red-400 font-semibold mb-1">⛔ IP Bloklandı</div>
            <div className="text-red-300 text-sm">
              {retryMinutes} dəqiqə sonra yenidən cəhd edin
            </div>
            <div className="text-red-500 text-xs mt-1">
              {banned.banned_until && new Date(banned.banned_until).toLocaleTimeString("az")} -ə qədər
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">İstifadəçi adı</label>
            <input
              type="text"
              autoComplete="username"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              disabled={loading || !!banned}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Şifrə</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              disabled={loading || !!banned}
              required
            />
          </div>

          {error && !banned && (
            <p className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !!banned}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Giriş edilir...
              </>
            ) : banned ? (
              `⛔ Bloklandı (${retryMinutes} dəq)`
            ) : (
              "🔑 Daxil ol"
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          10 uğursuz cəhddən sonra IP 1 saatlıq bloklanır
        </p>
      </div>
    </div>
  );
}
