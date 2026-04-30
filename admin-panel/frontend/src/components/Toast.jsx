import { useEffect, useState } from "react";

const ICONS = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
const COLORS = {
  success: "border-green-700 bg-green-950 text-green-300",
  error:   "border-red-700   bg-red-950   text-red-300",
  warning: "border-yellow-700 bg-yellow-950 text-yellow-300",
  info:    "border-blue-700  bg-blue-950  text-blue-300",
};

export function Toast({ toasts, remove }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 border rounded-xl px-4 py-3 shadow-xl text-sm transition-all animate-slide-in ${COLORS[t.type] || COLORS.info}`}
        >
          <span className="text-base mt-0.5">{ICONS[t.type]}</span>
          <p className="flex-1 leading-snug">{t.message}</p>
          <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 text-lg leading-none mt-0.5">×</button>
        </div>
      ))}
    </div>
  );
}

let _push = null;
export const toast = {
  success: (msg) => _push?.("success", msg),
  error:   (msg) => _push?.("error",   msg),
  warning: (msg) => _push?.("warning", msg),
  info:    (msg) => _push?.("info",    msg),
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = (id) => setToasts(ts => ts.filter(t => t.id !== id));
  const push   = (type, message) => {
    const id = Date.now();
    setToasts(ts => [...ts, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  };
  _push = push;

  return (
    <>
      {children}
      <Toast toasts={toasts} remove={remove} />
    </>
  );
}
