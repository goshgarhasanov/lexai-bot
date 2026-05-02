import { useEffect } from "react";

export default function Modal({ open, title, message, onConfirm, onCancel, danger, confirmText = "Təsdiqlə", cancelText = "Ləğv et" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter")  onConfirm?.();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl
                   animate-fade-in-up sm:animate-scale-in"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden mx-auto mb-3 w-10 h-1 rounded-full bg-gray-700" />
        <h3 id="modal-title" className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          {danger && <span aria-hidden>⚠️</span>}
          {title}
        </h3>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-gray-600
                       transition-all duration-200 ease-emph active:scale-[0.97]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 ease-emph active:scale-[0.97] shadow-md
                        ${danger
                          ? "bg-red-600 hover:bg-red-500 shadow-red-900/40 hover:shadow-glow-red"
                          : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40 hover:shadow-glow-blue"}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
