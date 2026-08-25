import { Bell, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";
import { useNotification } from "../../context/NotificationProvider";

export default function DashboardHeader() {
  const { openDrawer, unreadCount } = useNotification();

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
        <Link to="/admin" className="rounded-xl bg-white p-3 shadow hover:bg-slate-50 transition active:scale-95">
          <BarChart3 size={20} className="text-slate-700" />
        </Link>

        <button
          onClick={openDrawer}
          className="relative rounded-xl bg-white p-3 shadow hover:bg-slate-50 transition active:scale-95 cursor-pointer group"
          title="Notifications (Lost & Found, Nearby Reports)"
        >
          <Bell size={20} className="text-slate-700 group-hover:text-emerald-600 transition-colors" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </motion.header>
  );
}