import { AlertCircle, X } from "lucide-react";

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ChangeRoleModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: ChangeRoleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop click listener */}
      <div className="fixed inset-0" onClick={loading ? undefined : onClose} />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp z-10 font-sans">
        <button
          onClick={loading ? undefined : onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition p-1 rounded-lg"
          aria-label="Close"
          disabled={loading}
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-2xs">
          <AlertCircle size={24} />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900">
            Change Connect role?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your current Connect interface will change.
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-xs font-bold text-white transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? "Changing..." : "Change Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
