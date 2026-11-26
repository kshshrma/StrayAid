import { Bell } from "lucide-react";
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
      <div className="flex items-center gap-3.5">
        <Link
          to="/profile"
          className="cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 p-0.5 rounded-full glass border border-white/80 shadow-xs"
        >
          <Avatar />
        </Link>

        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-extrabold bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent tracking-tight">
              StrayAid AEOS
            </h2>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              Live
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-500">
            Good Morning, Rescuer 👋
          </p>
        </div>
      </div>

      <div className="flex items-center">
        <button
          onClick={openDrawer}
          className="relative rounded-2xl glass p-3 border border-white/80 shadow-xs hover:bg-white/90 transition-all duration-200 active:scale-90 cursor-pointer group"
          title="Notifications (Lost & Found, Nearby Reports)"
        >
          <Bell size={19} className="text-slate-700 group-hover:text-emerald-600 transition-colors" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white ring-2 ring-white animate-pulse shadow-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </motion.header>
  );
}