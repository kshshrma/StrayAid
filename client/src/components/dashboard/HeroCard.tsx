import { Heart, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import Card from "../ui/Card";

interface HeroCardProps {
  animalsHelped: number;
}

export default function HeroCard({ animalsHelped }: HeroCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-green-700 to-emerald-500 text-white border-none">

        <h2 className="text-xl font-bold leading-snug">
          Every rescue begins with someone who cares.
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-4">

          <div className="rounded-2xl bg-white/15 p-4">
            <Heart className="mb-2" />
            <h3 className="text-2xl font-bold">
              {animalsHelped}
            </h3>
            <p className="text-sm opacity-90">
              Lives Saved
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4">
            <Trophy className="mb-2" />
            <h3 className="text-2xl font-bold">
              Street Guardian
            </h3>
            <p className="text-sm opacity-90">
              Current Rank
            </p>
          </div>

        </div>

      </Card>
    </motion.div>
  );
}