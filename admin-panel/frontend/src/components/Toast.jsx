import { useEffect, useState } from "react";

const ICONS = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
const STYLES = {
  success: "border-green-700/60 bg-green-950/90 text-green-200 shadow-green-900/30",
  error:   "border-red-700/60   bg-red-950/90   text-red-200   shadow-red-900/30",
  warning: "border-yellow-700/60 bg-yellow-950/90 text-yellow-200 shadow-yellow-900/30",
  info:    "border-blue-700/60  bg-blue-950/90  text-blue-200  shadow-blue-900/30",
};

function ToastItem({ t, onRemove }) {
  const [leaving, setLeaving] = useState(false);
  const remove = () => {
    setLeaving(true);
    setTimeout(() => onRemove(t.id), 280);
  };

  useEffect(() => {
    const timer = setTimeout(remove, t.duration || 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 border rounded-xl pl-4 pr-3 py-3 shadow-xl text-sm backdrop-blur-md
                  glass-strong ${STYLES[t.type] || STYLES.info}
                  ${leaving ? "animate-fade-in-right opacity-0 translate-x-4 transition-all duration-250" : "animate-fade-in-up"}`}
      style={leaving ? { animation: "none" } : {}}
    >
      <span className="text-base mt-0.5 shrink-0" aria-hidden>{ICONS[t.type]}</span>
      <p className="flex-1 leading-snug pt-0.5">{t.message}</p>
      <button
        onClick={remove}
        className="opacity-60 hover:opacity-100 text-lg leading-none mt-0.5 px-1 transition-opacity"
        aria-label="Bağla"
      >×</button>
      {/* Progress bar */}
      <span
        className="absolute left-0 bottom-0 h-0.5 bg-current/40 rounded-bl-xl"
        style={{
          width: "100%",
          animation: `toast-progress ${t.duration || 4000}ms linear forwards`,
        }}
      />
      <style>{`@keyframes toast-progress { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
}

export function Toast({ toasts, remove }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-6 z-[70] space-y-2 sm:max-w-sm pointer-events-none">
      <div className="space-y-2 pointer-events-auto">
        {toasts.map(t => <ToastItem key={t.id} t={t} onRemove={remove} />)}
      </div>
    </div>
  );
}

let _push = null;
export const toast = {
  success: (msg, opts) => _push?.("success", msg, opts),
  error:   (msg, opts) => _push?.("error",   msg, opts),
  warning: (msg, opts) => _push?.("warning", msg, opts),
  info:    (msg, opts) => _push?.("info",    msg, opts),
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = (id) => setToasts(ts => ts.filter(t => t.id !== id));
  const push   = (type, message, opts = {}) => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, type, message, duration: opts.duration }]);
  };
  _push = push;

  return (
    <>
      {children}
      <Toast toasts={toasts} remove={remove} />
    </>
  );
}
