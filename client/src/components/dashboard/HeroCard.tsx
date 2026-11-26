import { Heart, Trophy, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface HeroCardProps {
  animalsHelped: number;
  onLivesSavedClick?: () => void;
  isGuardian?: boolean;
  guardianLevel?: string;
}

export default function HeroCard({
  animalsHelped,
  onLivesSavedClick,
  isGuardian,
  guardianLevel,
}: HeroCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white border border-white/25 shadow-xl shadow-emerald-900/15">
        {/* Ambient Specular Glass Blobs */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-teal-400/15 blur-2xl" />

        <div className="relative z-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-bold uppercase tracking-wider text-white">
            <Sparkles size={13} className="text-emerald-200" /> Community Mission
          </span>
        </div>

        <h2 className="relative z-10 mt-3 text-xl font-extrabold leading-snug tracking-tight text-white drop-shadow-xs">
          Every rescue begins with someone who cares.
        </h2>

        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3.5">
          <div
            onClick={onLivesSavedClick}
            className={`rounded-2xl p-4 bg-white/15 backdrop-blur-md border border-white/25 transition-all duration-200 shadow-sm ${
              onLivesSavedClick
                ? "cursor-pointer hover:bg-white/25 active:scale-95 group select-none hover:border-white/40 shadow-inner"
                : ""
            }`}
            role={onLivesSavedClick ? "button" : undefined}
            tabIndex={onLivesSavedClick ? 0 : undefined}
            title={onLivesSavedClick ? "Click to view all accepted rescue details" : undefined}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm">
                <Heart size={18} className={`transition-transform duration-200 ${onLivesSavedClick ? "group-hover:scale-110 fill-white text-white" : "text-white"}`} />
              </div>
              {onLivesSavedClick && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/25 hover:bg-white/35 px-2.5 py-1 rounded-full text-white backdrop-blur-md border border-white/20 shadow-xs">
                  View →
                </span>
              )}
            </div>
            <h3 className="text-3xl font-black tracking-tight text-white">
              {animalsHelped}
            </h3>
            <p className="text-xs font-semibold text-emerald-100/90 mt-0.5">
              {isGuardian ? "My Lives Saved" : "Lives Saved"}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-white/15 backdrop-blur-md border border-white/25 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm">
                <Trophy size={18} className="text-amber-300" />
              </div>
            </div>
            <h3 className="text-xl font-black tracking-tight truncate text-white">
              {isGuardian && guardianLevel ? guardianLevel : "Street Guardian"}
            </h3>
            <p className="text-xs font-semibold text-emerald-100/90 mt-0.5">
              {isGuardian ? "Guardian Level" : "Current Rank"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}