import { Check, ArrowRight } from "lucide-react";
import type { ConnectRole } from "../../services/connect/connectRoleService";

interface RoleSelectionViewProps {
  onSelectRole: (role: ConnectRole) => void;
  loadingRole?: boolean;
}

export default function RoleSelectionView({
  onSelectRole,
  loadingRole = false,
}: RoleSelectionViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl w-full mx-auto space-y-8 animate-fadeIn">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
            <span>🐾</span>
            <span>StrayAid Rescue Network</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Connect with the Rescue Network
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Choose how you want to connect with the StrayAid rescue network.
          </p>
        </div>

        {/* Two Large Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
          {/* 1. Guardian Card */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border-2 border-slate-200/90 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-4">
              {/* Badge & Emoji */}
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-3xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  🤝
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Volunteer Network
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                  Guardian
                </h2>
                <p className="text-sm font-bold text-emerald-600 mt-1">
                  Help animals in your area
                </p>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Guardians are volunteers who help rescue injured, abandoned,
                trapped, or vulnerable animals in their nearby area.
              </p>

              {/* Checklist */}
              <ul className="mt-5 space-y-2.5 pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>Receive rescue requests</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>View nearby rescue cases</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>Accept rescue assignments</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>Help transport or rescue animals</span>
                </li>
              </ul>
            </div>

            {/* Button */}
            <div className="pt-6 mt-4">
              <button
                type="button"
                disabled={loadingRole}
                onClick={() => onSelectRole("guardian")}
                className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
              >
                <span>Continue as Guardian</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* 2. NGO Card */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border-2 border-slate-200/90 hover:border-sky-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-4">
              {/* Badge & Emoji */}
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 text-3xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  🏢
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Coordination Center
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight group-hover:text-sky-700 transition-colors">
                  NGO
                </h2>
                <p className="text-sm font-bold text-sky-600 mt-1">
                  Coordinate animal rescue & support
                </p>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                NGOs and rescue organizations can coordinate with users,
                guardians, and other rescue teams to manage animal rescue cases.
              </p>

              {/* Checklist */}
              <ul className="mt-5 space-y-2.5 pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 rounded-full bg-sky-100 text-sky-700 items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>Receive rescue requests</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 rounded-full bg-sky-100 text-sky-700 items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>Coordinate rescue operations</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 rounded-full bg-sky-100 text-sky-700 items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>Communicate with users</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 rounded-full bg-sky-100 text-sky-700 items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>Manage rescue cases</span>
                </li>
              </ul>
            </div>

            {/* Button */}
            <div className="pt-6 mt-4">
              <button
                type="button"
                disabled={loadingRole}
                onClick={() => onSelectRole("ngo")}
                className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
              >
                <span>Continue as NGO</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-400 pt-2">
          Your role controls your Connect experience. You can switch between roles at any time.
        </p>
      </div>
    </div>
  );
}
