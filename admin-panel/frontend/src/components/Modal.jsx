export default function Modal({ open, title, message, onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
          >
            Ləğv et
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
              danger ? "bg-red-700 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Təsdiqlə
          </button>
        </div>
      </div>
    </div>
  );
}
