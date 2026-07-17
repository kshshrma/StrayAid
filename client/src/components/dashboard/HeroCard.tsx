import { Heart, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import Card from "../ui/Card";
import Button from "../ui/Button";

export default function HeroCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-green-700 to-emerald-500 text-white border-none">

        <p className="text-sm opacity-90">
          Your Impact Today
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Good Morning 👋
        </h2>

        <p className="mt-1 opacity-90">
          Every rescue begins with someone who cares.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">

          <div className="rounded-2xl bg-white/15 p-4">
            <Heart className="mb-2" />
            <h3 className="text-2xl font-bold">
              12
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

        <Button
          className="mt-8 w-full bg-white text-green-700 hover:bg-gray-100"
        >
          Report Animal
        </Button>

      </Card>
    </motion.div>
  );
}