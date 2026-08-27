import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getReportById } from "../services/report/getReportById";
import { updateAssignment } from "../services/rescue/updateAssignment";
import type { Report } from "../types/report";
import type { AppNotification } from "../types/notification";
import { connectSocket, disconnectSocket, getSocket } from "../services/socket";
import { getUnreadMessagesFromBackend } from "../services/lost-found/messageApiService";

interface IncomingAssignmentData {
  assignment: {
    id: string;
    report_id: string;
    distance_km: number | null;
    dispatch_score: number | null;
  };
  report: Report;
}

interface NotificationContextType {
  incoming: IncomingAssignmentData | null;
  setIncoming: React.Dispatch<React.SetStateAction<IncomingAssignmentData | null>>;
  notifications: AppNotification[];
  unreadCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp">) => void;
  simulateAlert: (type?: "lost_found" | "nearby_report" | "rescue_alert") => void;
  activeChat: { reportId: string; senderId: string } | null;
  setActiveChat: React.Dispatch<React.SetStateAction<{ reportId: string; senderId: string } | null>>;
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    category: "lost_found",
    title: "🚨 Lost Pet Alert: Max (Golden Retriever)",
    message: "Golden Retriever reported lost in Sector 62, Noida. Wearing a red collar. Keep an eye out!",
    timestamp: "10 mins ago",
    read: false,
    location: "Sector 62, Noida",
    distanceKm: 1.4,
    imageUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400",
    linkUrl: "/lost-found",
  },
  {
    id: "notif-2",
    category: "nearby_report",
    title: "📍 New Stray Report in Your Area",
    message: "Injured stray dog reported near Knowledge Park III. Medical assistance requested by local rescuer.",
    timestamp: "35 mins ago",
    read: false,
    location: "Knowledge Park III",
    distanceKm: 2.1,
    animalType: "Dog",
    imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400",
    linkUrl: "/reports/nearby",
  },
  {
    id: "notif-3",
    category: "lost_found",
    title: "✅ Pet Found Update: Persian Cat",
    message: "White fluffy Persian cat found resting near Indirapuram, Ghaziabad. Owner notified.",
    timestamp: "2 hours ago",
    read: true,
    location: "Indirapuram, Ghaziabad",
    distanceKm: 3.8,
    imageUrl: "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?auto=format&fit=crop&q=80&w=400",
    linkUrl: "/lost-found",
  },
  {
    id: "notif-4",
    category: "status_update",
    title: "🚑 Rescue Successful",
    message: "Report #104 (Injured Pup) has been successfully picked up by StrayAid Guardian.",
    timestamp: "5 hours ago",
    read: true,
    linkUrl: "/reports",
  },
];

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}

export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [incoming, setIncoming] = useState<IncomingAssignmentData | null>(null);
  const [updating, setUpdating] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_NOTIFICATIONS);
  const [activeChat, setActiveChat] = useState<{ reportId: string; senderId: string } | null>(null);

  const addMessageNotification = (msg: any) => {
    const messageText = `"${msg.content}"`;
    setNotifications((prev) => {
      const exists = prev.some((n) => n.meta?.messageId === msg.id);
      if (exists) return prev;

      const newNotif: AppNotification = {
        id: `msg-${msg.id}`,
        category: "lost_found",
        title: `✉️ New Secure Message`,
        message: messageText,
        read: msg.isRead,
        timestamp: "Just now",
        linkUrl: "/lost-found",
        meta: {
          messageId: msg.id,
          reportId: msg.reportId,
          senderId: msg.senderId,
          content: msg.content,
        },
      };
      return [newNotif, ...prev];
    });
  };
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addNotification = (
    data: Omit<AppNotification, "id" | "timestamp">
  ) => {
    const newNotif: AppNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: "Just now",
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const simulateAlert = (type: "lost_found" | "nearby_report" | "rescue_alert" = "lost_found") => {
    if (type === "lost_found") {
      addNotification({
        category: "lost_found",
        title: "🚨 New Lost Pet Reported Nearby",
        message: "Beagle puppy 'Charlie' missing near Sector 15. Please report if sighted!",
        read: false,
        location: "Sector 15, Noida",
        distanceKm: 0.8,
        imageUrl: "https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&q=80&w=400",
        linkUrl: "/lost-found",
      });
    } else if (type === "nearby_report") {
      addNotification({
        category: "nearby_report",
        title: "📍 New Area Report: Stray Kitten",
        message: "Dehydrated kitten found near Metro Station Gate 2. Food & foster care needed.",
        read: false,
        location: "Metro Gate 2, Noida",
        distanceKm: 0.5,
        linkUrl: "/reports/nearby",
      });
    } else {
      addNotification({
        category: "rescue_alert",
        title: "⚡ Urgent Rescue Request Assigned",
        message: "High priority rescue dispatched in your 3 km radius.",
        read: false,
        location: "Sector 62",
        distanceKm: 1.2,
        linkUrl: "/reports/immediate",
      });
    }
  };

  useEffect(() => {
    async function initSubscription() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Subscribe to all new report insertions for real-time local notifications
        const reportsChannel = supabase
          .channel("realtime:reports_notifications")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "reports",
            },
            async (payload) => {
              const newReport = payload.new as any;
              if (newReport) {
                let isOwnReport = false;
                try {
                  const meta = JSON.parse(newReport.ai_advice || "{}");
                  const { data: { session: currentSession } } = await supabase.auth.getSession();
                  if (currentSession?.user && meta.reporterId === currentSession.user.id) {
                    isOwnReport = true;
                  }
                } catch {}

                if (!isOwnReport) {
                  if (newReport.status === "lost" || newReport.status === "found") {
                    addNotification({
                      category: "lost_found",
                      title: "🐾 New Lost & Found Report",
                      message: "A new animal report has been posted nearby.",
                      read: false,
                      linkUrl: "/lost-found",
                      meta: { reportId: newReport.id },
                    });
                  } else {
                    addNotification({
                      category: "nearby_report",
                      title: `📍 New ${newReport.animal_type || "Animal"} Reported in Area`,
                      message: newReport.description || "A new animal report was posted near your location.",
                      read: false,
                      location: newReport.location || "Nearby",
                      linkUrl: `/reports/${newReport.id}`,
                      meta: { reportId: newReport.id, severity: newReport.severity },
                    });
                  }
                }
              }
            }
          )
          .subscribe();

        if (!session?.user) {
          disconnectSocket();
          return () => { reportsChannel.unsubscribe(); };
        }

        // Connect Socket.IO client and join user room
        connectSocket(session.user.id);

        // Fetch unread messages from backend and add them to notifications
        try {
          const unreadMsgs = await getUnreadMessagesFromBackend();
          unreadMsgs.forEach((msg: any) => {
            addMessageNotification(msg);
          });
        } catch (err) {
          console.error("Failed to fetch unread messages on login:", err);
        }

        // Setup real-time Socket.IO listener
        const socket = getSocket();
        socket.off("secure_message_received");
        socket.on("secure_message_received", (data: any) => {
          console.log("📨 Real-time secure message received via socket:", data);
          if (data && data.message) {
            addMessageNotification(data.message);
          }
        });

        // Fetch guardian profile if authenticated
        const { data: guardian } = await supabase
          .from("guardians")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (guardian) {
          const rescueChannel = supabase
            .channel(`realtime:rescue_assignments:${guardian.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "rescue_assignments",
                filter: `guardian_id=eq.${guardian.id}`,
              },
              async (payload) => {
                const newAssignment = payload.new as any;
                if (newAssignment && newAssignment.status === "pending") {
                  try {
                    const report = await getReportById(newAssignment.report_id);
                    setIncoming({
                      assignment: newAssignment,
                      report,
                    });
                    addNotification({
                      category: "rescue_alert",
                      title: "🚨 Emergency Rescue Assigned!",
                      message: `New rescue assigned for ${report.animal_type || "Animal"}. ${newAssignment.distance_km ?? 0} km away.`,
                      read: false,
                      distanceKm: newAssignment.distance_km,
                      linkUrl: "/reports/immediate",
                    });
                  } catch (err) {
                    console.error("Failed to load report for real-time notification:", err);
                  }
                }
              }
            )
            .subscribe();

          return () => {
            reportsChannel.unsubscribe();
            rescueChannel.unsubscribe();
          };
        }

        return () => {
          reportsChannel.unsubscribe();
        };
      } catch (err) {
        console.error("Failed to initialize notification subscription:", err);
      }
    }

    initSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      initSubscription();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleResponse(status: "accepted" | "rejected") {
    if (!incoming) return;
    try {
      setUpdating(true);
      await updateAssignment(incoming.assignment.id, { status });
      setIncoming(null);
      if (status === "accepted") {
        alert("🚒 Rescue request accepted! Please proceed to the location.");
      } else {
        alert("Rescue request rejected.");
      }
    } catch (error) {
      console.error("Failed responding to assignment via notification:", error);
      alert("Failed to respond to rescue assignment.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        incoming,
        setIncoming,
        notifications,
        unreadCount,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        addNotification,
        simulateAlert,
        activeChat,
        setActiveChat,
      }}
    >
      {children}

      {/* Floating Real-time Rescue Request Notification Banner */}
      {incoming && (
        <div className="fixed inset-x-4 top-5 z-50 mx-auto max-w-md animate-bounce rounded-3xl border border-red-100 bg-white/95 p-5 shadow-2xl backdrop-blur-md transition-all md:inset-x-auto md:right-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-2xl animate-pulse">
              🚨
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-base">
                Emergency Rescue Request Assigned!
              </h3>
              
              <p className="mt-1 text-sm font-semibold text-gray-800">
                🐾 {incoming.report.animal_type || "Unknown Animal"}
              </p>

              <div className="mt-2 flex gap-2 flex-wrap">
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                  {incoming.report.severity || "Critical"} Severity
                </span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                  📍 {incoming.assignment.distance_km ?? "Unknown"} km away
                </span>
              </div>

              {incoming.report.ai_advice && (
                <p className="mt-2 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
                  "{incoming.report.ai_advice}"
                </p>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleResponse("rejected")}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Decline
                </button>
                
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleResponse("accepted")}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 shadow-md shadow-red-200"
                >
                  {updating ? "Accepting..." : "🚒 Accept Rescue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
