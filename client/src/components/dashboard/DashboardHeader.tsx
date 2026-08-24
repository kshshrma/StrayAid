import { Bell, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";

export default function DashboardHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <Link to="/profile" className="cursor-pointer transition hover:opacity-85 hover:scale-105 active:scale-95 duration-200">
          <Avatar />
        </Link>

        <div>
          <h2 className="text-xl font-bold text-green-700">
            StrayAid AEOS
          </h2>

          <p className="text-sm text-gray-500">
            Good Morning, Rescuer 👋
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="rounded-xl bg-white p-3 shadow">
          <BarChart3 size={20} />
        </button>

        <button className="rounded-xl bg-white p-3 shadow">
          <Bell size={20} />
        </button>
      </div>
    </motion.header>
  );
}