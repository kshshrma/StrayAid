import { Link } from "react-router-dom";
import {
  Home,
  BookOpen,
  Bookmark,
  Ambulance,
  ShieldCheck,
  Award,
  Compass,
  Heart,
} from "lucide-react";

interface CommunityLeftSidebarProps {
  currentUser: {
    id: string;
    name: string;
    avatarUrl: string;
    role: string;
    livesSavedCount: number;
    storiesCount: number;
  };
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  onOpenGuidelines: () => void;
}

export default function CommunityLeftSidebar({
  currentUser,
  activeFilter,
  onSelectFilter,
  onOpenGuidelines,
}: CommunityLeftSidebarProps) {
  const navItems = [
    { id: "all", label: "Home Feed", icon: Home },
    { id: "my-stories", label: "My Stories", icon: BookOpen },
    { id: "saved", label: "Saved Stories", icon: Bookmark },
    { id: "Rescue Update", label: "Rescue Updates", icon: Ambulance },
  ];

  return (
    <aside className="space-y-5">
      {/* User Profile Summary Card */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-100 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 truncate">
              {currentUser.name}
            </h3>
            <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 truncate">
              <ShieldCheck size={13} className="shrink-0" />
              <span>{currentUser.role}</span>
            </p>
          </div>
        </div>

        {/* Quick Personal Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-base font-black text-slate-900 block leading-tight">
              {currentUser.storiesCount}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
              Stories
            </span>
          </div>

          <div className="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-100/70">
            <span className="text-base font-black text-emerald-700 block leading-tight">
              {currentUser.livesSavedCount}
            </span>
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mt-0.5">
              Lives Saved
            </span>
          </div>
        </div>

        <Link
          to="/profile"
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition"
        >
          View Full Profile
        </Link>
      </div>

      {/* Navigation Menu */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-3 space-y-1">
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Community Feeds
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectFilter(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-3 transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={16} className={isActive ? "text-white" : "text-slate-400"} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={onOpenGuidelines}
            className="w-full text-left px-3 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-3 transition"
          >
            <Award size={16} className="text-slate-400" />
            <span>Community Guidelines</span>
          </button>
        </div>
      </div>

      {/* Community Impact Statistics */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
            <Heart size={16} className="fill-emerald-400" />
          </span>
          <div>
            <h4 className="text-xs font-black tracking-tight">Community Impact</h4>
            <p className="text-[10px] text-slate-400">Delhi-NCR & Beyond</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
            <span className="text-lg font-black text-emerald-400 block leading-tight">
              180+
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Animals Saved
            </span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
            <span className="text-lg font-black text-white block leading-tight">
              24/7
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Emergency Triage
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-300 flex items-center gap-1.5 pt-1">
          <Compass size={13} className="text-emerald-400 shrink-0" />
          <span>Active smart radius: 10 km</span>
        </div>
      </div>
    </aside>
  );
}
