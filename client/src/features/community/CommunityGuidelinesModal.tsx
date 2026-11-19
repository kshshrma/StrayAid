import { X, ShieldCheck, Heart, AlertTriangle, Eye, CheckCircle2 } from "lucide-react";

interface CommunityGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommunityGuidelinesModal({
  isOpen,
  onClose,
}: CommunityGuidelinesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Community Guidelines
              </h2>
              <p className="text-xs text-slate-500">
                Building a compassionate, respectful animal rescue platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Guidelines List */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Heart className="text-emerald-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-bold text-slate-900">1. Compassion & Respect First</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                StrayAid connects animal lovers, feeders, rescuers, and veterinarians. Treat every member with empathy and constructive communication.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-bold text-slate-900">2. Accurate Emergency & Location Details</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                When reporting urgent cases or adoption alerts, provide accurate landmarks and contact channels. Avoid graphic shock-imagery where possible.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-bold text-slate-900">3. Verified Care & Safe Adoptions</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Adoption stories and foster updates must never request commercial breeding or illegal sales. All adoptions are free and welfare-focused.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Eye className="text-purple-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-bold text-slate-900">4. Community Moderation</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Spam, commercial advertisements, harassment, or false rescue claims will result in immediate suspension by verified Guardians and NGOs.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
