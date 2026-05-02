import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { encryptPayload } from "../api/crypto";

export default function Login() {
  const [form, setForm]       = useState({ username: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [banned, setBanned]   = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (banned) return;
    setLoading(true);
    setError("");

    try {
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
        setError(`⛔ Çox sayda uğursuz cəhd. IP ${res.data.retry_after_minutes} dəqiqəliyə bloklandı.`);
      } else {
        setError(res?.data?.error || "Giriş uğursuz oldu");
      }
    } finally {
      setLoading(false);
    }
  };

  const retryMinutes = banned?.retry_after_minutes;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative bg-gray-900/80 glass-strong border border-gray-800 rounded-3xl p-7 sm:p-10 w-full max-w-md shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="text-5xl mb-3 inline-block animate-fade-in" style={{ animationDelay: "100ms" }}>⚖️</div>
          <h1 className="text-2xl font-bold text-white animate-fade-in-up" style={{ animationDelay: "150ms" }}>HuquqAI</h1>
          <p className="text-gray-400 text-sm mt-1 animate-fade-in-up" style={{ animationDelay: "200ms" }}>Admin Panel</p>
        </div>

        {/* Ban warning */}
        {banned && (
          <div className="bg-red-950/60 border border-red-800 rounded-xl p-4 mb-4 text-center animate-fade-in-down">
            <div className="text-red-300 font-semibold mb-1">⛔ IP Bloklandı</div>
            <div className="text-red-400 text-sm">{retryMinutes} dəqiqə sonra yenidən cəhd edin</div>
            <div className="text-red-500 text-xs mt-1">
              {banned.banned_until && new Date(banned.banned_until).toLocaleTimeString("az")} -ə qədər
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 stagger-fast">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-medium">İstifadəçi adı</label>
            <input
              type="text"
              autoComplete="username"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all duration-200
                         disabled:opacity-50"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              disabled={loading || !!banned}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-medium">Şifrə</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-4 pr-12 py-3 text-white placeholder:text-gray-500
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all duration-200
                           disabled:opacity-50"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                disabled={loading || !!banned}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                disabled={loading || !!banned}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-all duration-200 active:scale-90 disabled:opacity-40"
                aria-label={showPassword ? "Şifrəni gizlə" : "Şifrəni göstər"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && !banned && (
            <p className="text-red-300 text-sm bg-red-950/60 border border-red-900 rounded-xl px-3 py-2.5 animate-fade-in-down">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !!banned}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-semibold py-3 rounded-xl transition-all duration-200 ease-emph active:scale-[0.98]
                       flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 hover:shadow-glow-blue"
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
              <>🔑 Daxil ol</>
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 text-[11px] mt-6">
          10 uğursuz cəhddən sonra IP 1 saatlıq bloklanır
        </p>
      </div>
    </div>
  );
}
