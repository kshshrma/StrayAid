import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  CheckCheck,
  MapPin,
  AlertTriangle,
  Search,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationProvider";
import type { AppNotification, NotificationCategory } from "../../types/notification";

export default function NotificationDrawer() {
  const {
    notifications,
    unreadCount,
    isDrawerOpen,
    closeDrawer,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    simulateAlert,
  } = useNotification();

  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const navigate = useNavigate();

  const filteredNotifications = notifications.filter((item: AppNotification) => {
    if (activeTab === "all") return true;
    if (activeTab === "lost_found") return item.category === "lost_found";
    if (activeTab === "nearby_report") return item.category === "nearby_report";
    if (activeTab === "rescue_alert") return item.category === "rescue_alert" || item.category === "status_update";
    return true;
  });

  const getCategoryBadge = (category: AppNotification["category"]) => {
    switch (category) {
      case "lost_found":
        return {
          label: "Lost & Found",
          bg: "bg-amber-100 text-amber-800 border-amber-200",
          icon: Search,
        };
      case "nearby_report":
        return {
          label: "Nearby Report",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          icon: MapPin,
        };
      case "rescue_alert":
        return {
          label: "Emergency Rescue",
          bg: "bg-rose-100 text-rose-800 border-rose-200",
          icon: ShieldAlert,
        };
      case "status_update":
        return {
          label: "Status Update",
          bg: "bg-blue-100 text-blue-800 border-blue-200",
          icon: CheckCircle2,
        };
      default:
        return {
          label: "Notification",
          bg: "bg-slate-100 text-slate-800 border-slate-200",
          icon: Bell,
        };
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    if (notification.linkUrl) {
      closeDrawer();
      navigate(notification.linkUrl);
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    Notifications
                  </h2>
                  <p className="text-xs text-slate-500">
                    Lost & Found alerts, local reports & rescue updates
                  </p>
                </div>
              </div>

              <button
                onClick={closeDrawer}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-header Actions */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-white">
              <span className="text-xs font-semibold text-slate-600">
                {unreadCount > 0 ? `${unreadCount} unread` : "All notifications read"}
              </span>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => simulateAlert("lost_found")}
                  title="Test lost pet notification trigger"
                  className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <Sparkles size={12} /> Test Alert
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto px-5 py-3 border-b border-slate-100 scrollbar-none bg-slate-50/50">
              {[
                { key: "all", label: "All" },
                { key: "lost_found", label: "🐾 Lost & Found" },
                { key: "nearby_report", label: "📍 Area Reports" },
                { key: "rescue_alert", label: "⚡ Rescues" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as NotificationCategory)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === tab.key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
                    <Bell size={28} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No notifications here</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    You're all caught up! New alerts regarding lost pets and nearby reports will show up here.
                  </p>
                  <button
                    onClick={() => simulateAlert("nearby_report")}
                    className="mt-4 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
                  >
                    <Sparkles size={14} /> Simulate Sample Report Alert
                  </button>
                </div>
              ) : (
                filteredNotifications.map((item: AppNotification) => {
                  const badge = getCategoryBadge(item.category);
                  const BadgeIcon = badge.icon;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => handleNotificationClick(item)}
                      className={`group relative rounded-2xl border p-4 transition-all cursor-pointer ${
                        item.read
                          ? "bg-white border-slate-200 opacity-85 hover:opacity-100 hover:border-slate-300"
                          : "bg-white border-emerald-200 ring-1 ring-emerald-500/20 shadow-sm"
                      }`}
                    >
                      {!item.read && (
                        <span className="absolute top-3.5 right-3.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                      )}

                      <div className="flex items-start gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-12 w-12 shrink-0 rounded-xl object-cover border border-slate-100 shadow-xs"
                          />
                        ) : (
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${badge.bg}`}>
                            <BadgeIcon size={20} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase border ${badge.bg}`}>
                              <BadgeIcon size={10} />
                              {badge.label}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">
                              {item.timestamp}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {item.title}
                          </h4>

                          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {item.message}
                          </p>

                          {(item.location || item.distanceKm !== undefined) && (
                            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                              {item.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} className="text-emerald-600" />
                                  {item.location}
                                </span>
                              )}
                              {item.distanceKm !== undefined && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  📍 {item.distanceKm} km away
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          View details <ExternalLink size={12} />
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(item.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                          title="Delete notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer Notice */}
            <div className="border-t border-slate-100 p-4 bg-white text-center">
              <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
                <AlertTriangle size={12} className="text-amber-500" />
                StrayAid local notifications refresh automatically via live area feed
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
