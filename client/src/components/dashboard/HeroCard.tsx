import { Heart, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import Card from "../ui/Card";

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
      <Card className="bg-gradient-to-br from-green-700 to-emerald-500 text-white border-none shadow-lg">

        <h2 className="text-xl font-bold leading-snug">
          Every rescue begins with someone who cares.
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-4">

          <div
            onClick={onLivesSavedClick}
            className={`rounded-2xl bg-white/15 p-4 transition-all ${
              onLivesSavedClick
                ? "cursor-pointer hover:bg-white/25 active:scale-95 shadow-sm group select-none"
                : ""
            }`}
            role={onLivesSavedClick ? "button" : undefined}
            tabIndex={onLivesSavedClick ? 0 : undefined}
            title={onLivesSavedClick ? "Click to view all accepted rescue details" : undefined}
          >
            <div className="flex items-center justify-between mb-2">
              <Heart className={`transition-transform ${onLivesSavedClick ? "group-hover:scale-110 fill-white/20" : ""}`} />
              {onLivesSavedClick && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white/95">
                  View →
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black">
              {animalsHelped}
            </h3>
            <p className="text-sm font-medium opacity-90">
              {isGuardian ? "My Lives Saved" : "Lives Saved"}
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4">
            <Trophy className="mb-2" />
            <h3 className="text-2xl font-bold truncate">
              {isGuardian && guardianLevel ? guardianLevel : "Street Guardian"}
            </h3>
            <p className="text-sm opacity-90">
              {isGuardian ? "Guardian Level" : "Current Rank"}
            </p>
          </div>

        </div>

      </Card>
    </motion.div>
  );
}