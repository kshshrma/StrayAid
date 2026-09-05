import { useState, useEffect, useRef } from "react";
import { Heart, Search, PlusCircle, X, ArrowLeft, Send, Ban, AlertTriangle, Bell, BellOff, Trash2, CheckSquare, Square } from "lucide-react";
import AnimalReportCard, { type LostFoundPet } from "../features/lost-found/AnimalReportCard";
import LostFoundFilters from "../features/lost-found/LostFoundFilters";
import LostAnimalForm from "../features/lost-found/LostAnimalForm";
import Button from "../components/ui/Button";
import { getLostFoundPets, getLostFoundPetById, getMyLostFoundPets } from "../services/lost-found/lostFoundService";
import { calculateDistance } from "../utils/distance";
import { useNotification } from "../context/NotificationProvider";
import { supabase } from "../lib/supabase";
import { getSocket } from "../services/socket";
import {
  getInboxFromBackend,
  getConversationMessagesFromBackend,
  sendMessageToConversation,
  markConversationAsReadOnBackend,
  blockConversation,
  reportConversation,
} from "../services/lost-found/messageApiService";

export default function LostFound() {
  const { notifications, markAsRead, activeChat, setActiveChat, markConversationNotificationsAsRead, deleteNotification } = useNotification();
  const [filter, setFilter] = useState<"all" | "lost" | "found">("all");

  const lostFoundNotifications = notifications.filter(
    (n) => n.category === "lost_found" && !n.read
  );

  const messageNotifications = lostFoundNotifications.filter(
    (n) => n.title.includes("✉️")
  );

  const newReportNotifications = lostFoundNotifications.filter(
    (n) => !n.title.includes("✉️")
  );

  const [showLeftDropdown, setShowLeftDropdown] = useState(false);
  const [showInboxAlertsDropdown, setShowInboxAlertsDropdown] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [pets, setPets] = useState<LostFoundPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Private Inbox & Chat Redesign States
  const [showInboxView, setShowInboxView] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [typingUser, setTypingUser] = useState<{ userId: string; userName: string } | null>(null);
  const [typingTimeoutId, setTypingTimeoutId] = useState<any>(null);

  // My Reports States
  const [showMyReportsView, setShowMyReportsView] = useState(false);
  const [myPets, setMyPets] = useState<LostFoundPet[]>([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);

  // Notification dropdown states
  const [isSilenced, setIsSilenced] = useState(localStorage.getItem("strayaid_lostfound_silenced") === "true");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);

  const toggleSilence = () => {
    const newVal = !isSilenced;
    setIsSilenced(newVal);
    localStorage.setItem("strayaid_lostfound_silenced", String(newVal));
  };

  const handleClearAllNotifs = () => {
    newReportNotifications.forEach((n) => {
      markAsRead(n.id);
    });
    setShowLeftDropdown(false);
  };

  const handleToggleSelectNotif = (id: string) => {
    setSelectedNotifIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedNotifs = () => {
    selectedNotifIds.forEach((id) => {
      deleteNotification(id);
    });
    setSelectedNotifIds([]);
    setIsSelectMode(false);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get browser coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (err) => {
          console.error("Geolocation error fetching location for sorting:", err);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Get logged-in user ID
  useEffect(() => {
    async function getUserId() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      }
    }
    getUserId();
  }, []);

  // Listen to activeChat notifications click to launch Inbox View
  useEffect(() => {
    if (activeChat && !activeChat.showReportDetails) {
      setShowInboxView(true);
      
      // Attempt to find conversation matching reportId and senderId
      async function selectNotificationConversation() {
        try {
          const inbox = await getInboxFromBackend();
          setConversations(inbox);
          if (activeChat) {
            const found = inbox.find(
              (c: any) =>
                c.reportId === activeChat.reportId &&
                c.otherParticipantId === activeChat.senderId
            );
            if (found) {
              setActiveConversationId(found.conversationId);
            }
          }
        } catch (e) {
          console.error("Failed to select conversation on activeChat alert:", e);
        }
      }
      selectNotificationConversation();
    }
  }, [activeChat]);

  // Load Inbox List
  useEffect(() => {
    if (!showInboxView || !currentUserId) return;

    async function loadInbox() {
      try {
        setLoadingInbox(true);
        const data = await getInboxFromBackend();
        setConversations(data);
      } catch (err) {
        console.error("Failed to load inbox list:", err);
      } finally {
        setLoadingInbox(false);
      }
    }
    loadInbox();
  }, [showInboxView, currentUserId, messageNotifications.length]);

  // Load My Reports
  useEffect(() => {
    if (!showMyReportsView || !currentUserId) return;

    async function loadMyReports() {
      try {
        setLoadingMyReports(true);
        const data = await getMyLostFoundPets();
        setMyPets(data);
      } catch (err) {
        console.error("Failed to load my reports:", err);
      } finally {
        setLoadingMyReports(false);
      }
    }
    loadMyReports();
  }, [showMyReportsView, currentUserId]);

  // Scroll messages to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // Handle active conversation room changes and fetch message logs
  useEffect(() => {
    if (!activeConversationId || !currentUserId) {
      setMessages([]);
      return;
    }

    const convId = activeConversationId;
    const socket = getSocket();
    
    // Join conversation room
    socket.emit("join_conversation_room", convId);
    console.log(`🔌 Client joined conversation socket room: conversation:${convId}`);

    async function fetchMessages() {
      try {
        setLoadingMessages(true);
        const data = await getConversationMessagesFromBackend(convId);
        setMessages(data.messages || []);
        
        // Mark conversation read on backend
        await markConversationAsReadOnBackend(convId);
        
        // Mark notifications read locally
        markConversationNotificationsAsRead(convId);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    }
    fetchMessages();

    // Setup Socket listeners for active conversation
    const handleNewMessage = (data: any) => {
      if (data && data.message && data.message.conversationId === activeConversationId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        
        // Mark as read locally and backend
        markConversationAsReadOnBackend(activeConversationId);
        markConversationNotificationsAsRead(activeConversationId);
      }
    };

    const handleTypingStart = (data: any) => {
      if (data && data.conversationId === activeConversationId && data.userId !== currentUserId) {
        setTypingUser({ userId: data.userId, userName: data.userName });
      }
    };

    const handleTypingStop = (data: any) => {
      if (data && data.conversationId === activeConversationId && data.userId !== currentUserId) {
        setTypingUser(null);
      }
    };

    const handleMessagesRead = (data: any) => {
      if (data && data.conversationId === activeConversationId && data.readerId !== currentUserId) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.emit("leave_conversation_room", activeConversationId);
      socket.off("new_message", handleNewMessage);
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      socket.off("messages_read", handleMessagesRead);
      setTypingUser(null);
    };
  }, [activeConversationId, currentUserId]);

  // Global socket listener to update unread counts or append messages when chat screen is closed
  useEffect(() => {
    if (!currentUserId) return;

    const socket = getSocket();
    
    const handleReceiveMessageGlobal = (data: any) => {
      if (data && data.message) {
        const msg = data.message;
        
        // If the inbox list is open, we re-fetch to reflect preview updates
        if (showInboxView && msg.conversationId !== activeConversationId) {
          getInboxFromBackend().then((inbox) => setConversations(inbox));
        }
      }
    };

    socket.on("secure_message_received", handleReceiveMessageGlobal);

    return () => {
      socket.off("secure_message_received", handleReceiveMessageGlobal);
    };
  }, [currentUserId, showInboxView, activeConversationId]);

  // typing notifier emitter
  const handleReplyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReplyText(e.target.value);

    const socket = getSocket();
    if (activeConversationId && currentUserId) {
      socket.emit("typing_start", {
        conversationId: activeConversationId,
        userId: currentUserId,
        userName: "Someone",
      });

      if (typingTimeoutId) clearTimeout(typingTimeoutId);

      const timeout = setTimeout(() => {
        socket.emit("typing_stop", {
          conversationId: activeConversationId,
          userId: currentUserId,
        });
      }, 2000);
      setTypingTimeoutId(timeout);
    }
  };

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !activeConversationId) return;

    const content = replyText.trim();
    setReplyText("");

    const socket = getSocket();
    if (socket) {
      socket.emit("typing_stop", {
        conversationId: activeConversationId,
        userId: currentUserId,
      });
    }

    try {
      const newMsg = await sendMessageToConversation(activeConversationId, content);
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === newMsg.id);
        if (exists) return prev;
        return [...prev, newMsg];
      });
      
      // Update conversations list preview
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === activeConversationId
            ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to send reply:", err);
      setReplyText(content); // restore input
      alert("Failed to send reply. Please try again.");
    }
  }

  // Conversation Context Actions
  async function handleContextViewReport(reportId: string, otherParticipantId: string) {
    try {
      let pet = pets.find((p) => p.id === reportId);
      if (!pet) {
        const fetched = await getLostFoundPetById(reportId);
        if (!fetched) {
          alert("This report is no longer available.");
          return;
        }
        pet = fetched;
        setPets((prev) => [fetched, ...prev]);
      }

      setShowInboxView(false);
      setFilter("all"); // Ensure list is unfiltered so matching card mounts in DOM
      
      setActiveChat({
        reportId,
        senderId: otherParticipantId,
        showReportDetails: true,
      });
    } catch (err) {
      console.error(err);
      alert("This report is no longer available.");
    }
  }

  async function handleBlockInbox(conversationId: string) {
    if (!confirm("Are you sure you want to block this user? Messaging for this conversation will be closed.")) return;
    try {
      await blockConversation(conversationId);
      alert("User blocked! Previous message history preserved read-only.");
    } catch (e) {
      alert("Failed to block participant.");
    }
  }

  async function handleReportInbox(conversationId: string) {
    if (!confirm("Are you sure you want to report this message? StrayAid moderation will review the conversation logs.")) return;
    try {
      await reportConversation(conversationId);
      alert("Conversation reported. Thank you for keeping StrayAid safe.");
    } catch (e) {
      alert("Failed to file report.");
    }
  }

  function handleQuickActionReply(text: string) {
    setReplyText(text);
  }

  // Listen for real-time updates to reports to trigger re-fetching
  useEffect(() => {
    const channel = supabase
      .channel("realtime:reports_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reports",
        },
        () => {
          getLostFoundPets().then((data) => {
            if (coords) {
              const petsWithDistance = data.map((pet) => {
                const [latStr, lonStr] = pet.location.split(",");
                const petLat = parseFloat(latStr.trim());
                const petLon = parseFloat(lonStr.trim());
                let distanceKm = 0;
                if (!isNaN(petLat) && !isNaN(petLon)) {
                  distanceKm = calculateDistance(coords.lat, coords.lon, petLat, petLon);
                }
                return { ...pet, distanceKm: parseFloat(distanceKm.toFixed(2)) };
              });
              petsWithDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
              setPets(petsWithDistance);
            } else {
              data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setPets(data);
            }
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [coords]);

  // Fetch reports and sort
  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const data = await getLostFoundPets();

        if (coords) {
          const petsWithDistance = data.map((pet) => {
            const [latStr, lonStr] = pet.location.split(",");
            const petLat = parseFloat(latStr.trim());
            const petLon = parseFloat(lonStr.trim());
            
            let distanceKm = 0;
            if (!isNaN(petLat) && !isNaN(petLon)) {
              distanceKm = calculateDistance(coords.lat, coords.lon, petLat, petLon);
            }
            
            return {
              ...pet,
              distanceKm: parseFloat(distanceKm.toFixed(2)),
            };
          });

          petsWithDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
          setPets(petsWithDistance);
        } else {
          data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setPets(data);
        }
      } catch (err) {
        console.error("Error loading Lost & Found reports:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [coords]);

  const filteredPets = filter === "all" ? pets : pets.filter((pet) => pet.type === filter);
  const filteredMyPets = filter === "all" ? myPets : myPets.filter((pet) => pet.type === filter);

  function handleFormSubmitSuccess(newReport: LostFoundPet) {
    let petWithDistance = { ...newReport };
    if (coords) {
      const [latStr, lonStr] = newReport.location.split(",");
      const petLat = parseFloat(latStr.trim());
      const petLon = parseFloat(lonStr.trim());
      let distanceKm = 0;
      if (!isNaN(petLat) && !isNaN(petLon)) {
        distanceKm = calculateDistance(coords.lat, coords.lon, petLat, petLon);
      }
      petWithDistance.distanceKm = parseFloat(distanceKm.toFixed(2));
    }

    setPets((prev) => {
      const updatedList = [petWithDistance, ...prev];
      if (coords) {
        updatedList.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }
      return updatedList;
    });

    if (showMyReportsView) {
      getMyLostFoundPets().then((data) => setMyPets(data));
    }

    setIsFormOpen(false);
    setShowSuccessPopup(true);
  }

  // Active Conversations Count
  const inboxUnreadTotal = messageNotifications.length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 pb-24 animate-fadeIn">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* INBOX VIEW COMPONENT PANEL */}
        {showInboxView ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden min-h-[75vh] flex flex-col animate-slideUp font-sans">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                onClick={() => {
                  setShowInboxView(false);
                  setActiveConversationId(null);
                  setActiveChat(null);
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-black cursor-pointer transition"
              >
                <ArrowLeft size={16} /> Back to Lost & Found
              </button>
              
              <div className="flex items-center gap-4 relative">
                
                {/* 🔔 Message Alerts Dropdown Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowInboxAlertsDropdown(!showInboxAlertsDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-xs"
                  >
                    <Bell size={13} className="text-slate-500 shrink-0" />
                    <span>Alerts</span>
                    {messageNotifications.length > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 font-sans">
                        {messageNotifications.length}
                      </span>
                    )}
                  </button>

                  {/* Message Alerts Dropdown List */}
                  {showInboxAlertsDropdown && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-150 shadow-2xl p-4 space-y-3 z-50 animate-slideRight">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[10px] font-black text-slate-550 uppercase tracking-wider flex items-center gap-1">
                          🔔 Message Alerts
                        </span>
                        {messageNotifications.length > 0 && (
                          <button
                            onClick={() => {
                              messageNotifications.forEach((n) => markAsRead(n.id));
                              setShowInboxAlertsDropdown(false);
                            }}
                            className="text-[9px] font-black text-slate-405 hover:text-slate-650 transition cursor-pointer font-sans"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {messageNotifications.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-[10px] font-bold">
                            No unread message alerts.
                          </div>
                        ) : (
                          messageNotifications.map((notif) => (
                            <div
                              key={notif.id}
                              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-center gap-2 justify-between animate-fadeIn text-xs"
                            >
                              <button
                                onClick={() => {
                                  markAsRead(notif.id);
                                  setShowInboxAlertsDropdown(false);
                                  if (notif.meta?.conversationId) {
                                    setActiveConversationId(notif.meta.conversationId);
                                  }
                                }}
                                className="flex-1 text-left min-w-0 hover:opacity-85 transition cursor-pointer"
                              >
                                <h5 className="font-extrabold text-slate-800 text-[10px] truncate">{notif.title}</h5>
                                <p className="text-[10px] text-slate-550 truncate mt-0.5" title={notif.message}>{notif.message}</p>
                              </button>
                              
                              <button
                                onClick={() => {
                                  deleteNotification(notif.id);
                                }}
                                className="text-[9px] text-red-500 hover:text-red-700 font-extrabold cursor-pointer shrink-0 ml-1 bg-red-50 hover:bg-red-100 p-1 px-2 rounded-lg border border-red-100"
                              >
                                Dismiss
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 animate-fadeIn">
                  📥 Inbox {inboxUnreadTotal > 0 && <span className="bg-green-700 text-white text-[9px] px-2 py-0.5 rounded-full shrink-0 font-sans">{inboxUnreadTotal}</span>}
                </h2>
              </div>
            </div>

            {/* Content Inbox Grid split */}
            <div className="flex-1 flex overflow-hidden h-[65vh]">
              
              {/* Left Panel: Conversations List (Hidden on mobile when chat is open) */}
              <div
                className={`w-full md:w-1/3 border-r border-slate-100 flex flex-col ${
                  activeConversationId ? "hidden md:flex" : "flex"
                }`}
              >
                <div className="p-4 border-b border-slate-50">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversations</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[58vh]">
                  {loadingInbox ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-bold animate-pulse">Loading inbox...</div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-2 text-slate-400">
                      <span className="text-2xl block">📥</span>
                      <h4 className="text-[11px] font-black text-slate-700">Inbox is empty</h4>
                      <p className="text-[9px] leading-relaxed">When someone contacts you about a report, it will show up here.</p>
                    </div>
                  ) : (
                    conversations.map((conv) => {
                      const isActive = conv.conversationId === activeConversationId;
                      return (
                        <button
                          key={conv.conversationId}
                          onClick={() => setActiveConversationId(conv.conversationId)}
                          className={`w-full p-3 rounded-2xl flex items-start gap-2.5 transition text-left cursor-pointer border ${
                            isActive
                              ? "bg-green-700 text-white border-green-700 shadow-md shadow-green-100/50"
                              : conv.unreadCount > 0
                              ? "bg-emerald-50/30 border-emerald-100"
                              : "bg-white hover:bg-slate-50 border-slate-100/50"
                          }`}
                        >
                          {conv.otherParticipantAvatar ? (
                            <img src={conv.otherParticipantAvatar} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-100 shrink-0" />
                          ) : (
                            <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-black text-xs ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-650"}`}>
                              {conv.otherParticipantName.substring(0, 1).toUpperCase()}
                            </div>
                          )}
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-start gap-1">
                              <h4 className={`text-xs font-black truncate ${isActive ? "text-white" : "text-slate-800"}`}>
                                {conv.otherParticipantName}
                              </h4>
                              {conv.unreadCount > 0 && !isActive && (
                                <span className="bg-emerald-650 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                                  New
                                </span>
                              )}
                            </div>
                            
                            <span className={`text-[9px] block font-bold truncate mt-0.5 ${isActive ? "text-white/80" : "text-slate-400"}`}>
                              🐾 {conv.reportName} • <span className="capitalize">{conv.reportStatus}</span>
                            </span>
                            
                            <p className={`text-[10px] truncate mt-1 ${isActive ? "text-white/90" : "text-slate-550"}`}>
                              {conv.lastMessage}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Panel: Chat Thread (Hidden on mobile when no chat is open) */}
              <div
                className={`w-full md:w-2/3 flex flex-col bg-slate-50/50 ${
                  activeConversationId ? "flex" : "hidden md:flex items-center justify-center"
                }`}
              >
                {activeConversationId ? (
                  <>
                    {/* Active Chat Header */}
                    {(() => {
                      const activeConv = conversations.find(c => c.conversationId === activeConversationId);
                      if (!activeConv) return null;
                      
                      return (
                        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm shrink-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Back button for mobile view */}
                            <button
                              onClick={() => setActiveConversationId(null)}
                              className="md:hidden p-1 text-slate-400 hover:text-slate-700 cursor-pointer mr-0.5"
                            >
                              <ArrowLeft size={16} />
                            </button>
                            
                            {activeConv.otherParticipantAvatar ? (
                              <img src={activeConv.otherParticipantAvatar} alt="" className="w-8 h-8 rounded-full object-cover border" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-650">
                                {activeConv.otherParticipantName.substring(0, 1).toUpperCase()}
                              </div>
                            )}
                            
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-850 truncate">{activeConv.otherParticipantName}</h4>
                              <p className="text-[9px] font-bold text-slate-400 truncate">
                                Context: <span className="text-slate-600 font-extrabold">{activeConv.reportName}</span> ({activeConv.reportStatus})
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {activeConv.reportId && (
                              <button
                                onClick={() => handleContextViewReport(activeConv.reportId, activeConv.otherParticipantId)}
                                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[9px] font-black text-slate-700 cursor-pointer shadow-xs transition"
                              >
                                View Report
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleBlockInbox(activeConversationId)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                              title="Block User"
                            >
                              <Ban size={13} />
                            </button>
                            <button
                              onClick={() => handleReportInbox(activeConversationId)}
                              className="p-1 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                              title="Report Conversation"
                            >
                              <AlertTriangle size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Chat Messages Logs */}
                    <div className="flex-1 overflow-y-auto p-4 min-h-[40vh] max-h-[44vh] flex flex-col">
                      {loadingMessages ? (
                        <div className="text-center py-8 text-slate-400 text-xs font-bold my-auto animate-pulse">
                          Loading message history...
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs font-bold my-auto">
                          No messages yet. Send a message below to start private chat thread.
                        </div>
                      ) : (
                        messages.map((m, idx) => {
                          const isMe = String(m.senderId).toLowerCase() === String(currentUserId).toLowerCase();
                          
                          // Custom grouping spacing
                          const prevMsg = idx > 0 ? messages[idx - 1] : null;
                          const isSameSender = prevMsg && String(prevMsg.senderId).toLowerCase() === String(m.senderId).toLowerCase();
                          const mtClass = isSameSender ? "mt-1.5" : "mt-4";

                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${mtClass} space-y-0.5`}
                            >
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-xs font-semibold max-w-[75%] md:max-w-[80%] leading-relaxed shadow-xs ${
                                  isMe
                                    ? "bg-green-700 text-white rounded-tr-none"
                                    : "bg-white border border-slate-200/50 text-slate-800 rounded-tl-none"
                                }`}
                              >
                                {m.content}
                              </div>
                              <span className="text-[8px] text-slate-400 px-1 font-medium select-none">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {isMe && (
                                  <span className="ml-1 font-bold">
                                    {m.isRead ? " • Read" : " • Sent"}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })
                      )}
                      
                      {typingUser && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-450 font-bold bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/40 w-fit animate-pulse">
                          <span>💬</span>
                          <span>{typingUser.userName || "Participant"} is typing...</span>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message templates Quick Actions */}
                    <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 pt-1 border-t border-slate-100 bg-white select-none shrink-0">
                      <button
                        onClick={() => handleQuickActionReply("👀 I saw this animal nearby!")}
                        className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
                      >
                        👀 Sighted Animal
                      </button>
                      <button
                        onClick={() => handleQuickActionReply("📍 I know this location.")}
                        className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
                      >
                        📍 Know Location
                      </button>
                      <button
                        onClick={() => handleQuickActionReply("🐾 I found this animal!")}
                        className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
                      >
                        🐾 Found Animal
                      </button>
                      <button
                        onClick={() => handleQuickActionReply("🤝 Let's organize secure handover.")}
                        className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
                      >
                        🤝 Handover
                      </button>
                    </div>

                    {/* Send Input Form */}
                    <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0 items-center">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={replyText}
                        onChange={handleReplyInputChange}
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                      <button
                        type="submit"
                        className="p-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl cursor-pointer transition shadow-md shadow-green-100 flex items-center justify-center shrink-0 border border-green-700"
                      >
                        <Send size={15} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center p-8 space-y-2 text-slate-400 my-auto">
                    <span className="text-4xl block">💬</span>
                    <h3 className="text-sm font-black text-slate-700">Select a conversation</h3>
                    <p className="text-[10px] max-w-xs leading-relaxed mx-auto">
                      Choose one from the left sidebar panel to start chatting in real time.
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : showMyReportsView ? (
          /* My Reports View */
          <>
            {/* 1. PAGE HEADER */}
            <div className="text-center md:text-left space-y-1 pb-2 border-b border-slate-100 relative">
              <button
                onClick={() => {
                  setShowMyReportsView(false);
                  setShowInboxView(false);
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-black cursor-pointer transition mb-2"
              >
                <ArrowLeft size={16} /> Back to All Reports
              </button>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-2">
                📋 My Reports
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Manage and trace Lost & Found cases you reported.
              </p>
            </div>

            {/* 2. PRIMARY ACTIONS */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setIsFormOpen(true)}
                className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-green-100/80 hover:shadow-lg text-xs uppercase tracking-wider"
              >
                <PlusCircle size={16} /> Report Lost Animal
              </Button>
              
              <Button
                onClick={() => {
                  setShowMyReportsView(false);
                  setShowInboxView(false);
                }}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-750 font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md text-xs uppercase tracking-wider"
              >
                📋 View All Reports
              </Button>
            </div>

            {/* 3. FILTERS */}
            <div className="max-w-md">
              <LostFoundFilters filter={filter} setFilter={setFilter} />
            </div>

            {/* 4. MY REPORTS GRID */}
            <div>
              {loadingMyReports ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-3xl border border-slate-100 shadow-sm animate-fadeIn">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
                  <p className="text-xs font-semibold text-slate-500">Retrieving your reports...</p>
                </div>
              ) : filteredMyPets.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-150 shadow-xs max-w-lg mx-auto space-y-4 my-6 animate-fadeIn">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 text-slate-450 flex items-center justify-center text-lg">
                    📋
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-black text-slate-800 leading-tight">
                      You haven't created any Lost & Found reports yet.
                    </h3>
                    <p className="text-[11px] text-slate-450 font-semibold leading-relaxed">
                      If an animal is missing or you've found one, you can create a report and help bring them home.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-green-700 hover:bg-green-800 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider mx-auto"
                  >
                    Report Animal
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fadeIn">
                  {filteredMyPets.map((pet) => (
                    <div key={pet.id} id={`report-card-${pet.id}`} className="h-full transition-all duration-300 rounded-3xl">
                      <AnimalReportCard pet={pet} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Lost & Found main feed layout */
          <>
            {/* 1. PAGE HEADER */}
            <div className="text-center md:text-left space-y-1 pb-2 border-b border-slate-100 relative">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-2">
                <Search className="text-green-700 shrink-0" size={32} /> Lost & Found
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Help reunite lost animals with the people who love them.
              </p>
            </div>

            {/* TOP LEFT: LOST & FOUND ALERTS INDICATOR */}
            <div className="fixed top-6 left-6 z-50 pointer-events-auto flex flex-col items-start gap-2">
              <button
                onClick={() => setShowLeftDropdown(!showLeftDropdown)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300 font-extrabold text-slate-800 text-xs cursor-pointer select-none group ${
                  newReportNotifications.length > 0 ? "animate-bounce" : ""
                }`}
              >
                <span>🐾 Lost & Found</span>
                {newReportNotifications.length > 0 && (
                  <span className="bg-red-500 text-white font-black px-2 py-0.5 rounded-full text-[9px] min-w-5 text-center">
                    {newReportNotifications.length}
                  </span>
                )}
              </button>

              {showLeftDropdown && (
                <div className="w-80 rounded-3xl bg-white/95 border border-slate-100 shadow-2xl p-4 space-y-3.5 backdrop-blur-md animate-slideRight">
                  
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      🐾 Notification Alerts
                    </span>
                    <button
                      onClick={() => {
                        setShowLeftDropdown(false);
                        setIsSelectMode(false);
                        setSelectedNotifIds([]);
                      }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 hover:bg-slate-100 rounded-full transition"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-col gap-2 pt-0.5">
                    
                    {/* Silence Toggle Switch */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-650 flex items-center gap-1.5 select-none">
                        {isSilenced ? (
                          <BellOff size={13} className="text-red-500 shrink-0" />
                        ) : (
                          <Bell size={13} className="text-green-600 shrink-0 animate-pulse" />
                        )}
                        Silence Lost/Found Alerts
                      </span>
                      <button
                        onClick={toggleSilence}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                          isSilenced ? "bg-red-500" : "bg-slate-200"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                            isSilenced ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Notification Toolbar (if notifications exist) */}
                    {newReportNotifications.length > 0 && (
                      <div className="flex items-center gap-2 justify-end text-[10px] font-extrabold text-slate-500 select-none">
                        {isSelectMode ? (
                          <>
                            <button
                              onClick={handleDeleteSelectedNotifs}
                              disabled={selectedNotifIds.length === 0}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition ${
                                selectedNotifIds.length > 0
                                  ? "bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                                  : "text-slate-350 bg-slate-50 cursor-not-allowed"
                              }`}
                            >
                              <Trash2 size={12} /> Delete ({selectedNotifIds.length})
                            </button>
                            <button
                              onClick={() => {
                                setIsSelectMode(false);
                                setSelectedNotifIds([]);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setIsSelectMode(true)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-655 hover:text-slate-850 cursor-pointer flex items-center gap-1"
                            >
                              Select Option
                            </button>
                            <button
                              onClick={handleClearAllNotifs}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-655 hover:text-slate-855 cursor-pointer"
                            >
                              Clear All
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* List Content */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {newReportNotifications.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-[10px] font-bold">
                        No new report notifications.
                      </div>
                    ) : (
                      newReportNotifications.map((notif) => {
                        const isSelected = selectedNotifIds.includes(notif.id);
                        return (
                          <div
                            key={notif.id}
                            className={`p-2.5 rounded-2xl border transition flex items-center gap-2 justify-between ${
                              isSelectMode
                                ? "bg-slate-50/50 hover:bg-slate-50 border-slate-100"
                                : "bg-red-50/40 border-red-100/40"
                            }`}
                          >
                            {/* Checkbox for selection mode */}
                            {isSelectMode && (
                              <button
                                onClick={() => handleToggleSelectNotif(notif.id)}
                                className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer p-0.5"
                              >
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-red-500 fill-red-100" />
                                ) : (
                                  <Square size={16} className="text-slate-350" />
                                )}
                              </button>
                            )}

                            {/* Alert Content Card */}
                            <button
                              onClick={() => {
                                if (isSelectMode) {
                                  handleToggleSelectNotif(notif.id);
                                  return;
                                }
                                markAsRead(notif.id);
                                if (newReportNotifications.length <= 1) setShowLeftDropdown(false);
                                if (notif.meta?.reportId) {
                                  const element = document.getElementById(`report-card-${notif.meta.reportId}`);
                                  if (element) {
                                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                                    element.classList.add("ring-4", "ring-red-500/20");
                                    setTimeout(() => {
                                      element.classList.remove("ring-4", "ring-red-500/20");
                                    }, 3000);
                                  }
                                }
                              }}
                              className="flex items-center gap-2 min-w-0 text-left hover:opacity-80 transition cursor-pointer flex-1"
                            >
                              {notif.imageUrl && (
                                <img src={notif.imageUrl} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-100" />
                              )}
                              <div className="min-w-0">
                                <h5 className="text-[11px] font-bold text-slate-800 truncate">{notif.title}</h5>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5" title={notif.message}>{notif.message}</p>
                              </div>
                            </button>

                            {/* Dismiss button (hidden in select mode) */}
                            {!isSelectMode && (
                              <button
                                onClick={() => {
                                  deleteNotification(notif.id);
                                }}
                                className="text-[9px] text-red-650 hover:text-red-800 font-extrabold cursor-pointer shrink-0 ml-1.5 self-center bg-red-50/50 hover:bg-red-55 px-2 py-1 rounded-lg border border-red-100"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* TOP RIGHT: INBOX BUTTON INSTEAD OF SECURE MESSAGES */}
            <div className="fixed top-6 right-6 z-50 pointer-events-auto flex flex-col items-end gap-2">
              <button
                onClick={() => {
                  setShowInboxView(true);
                  setShowMyReportsView(false);
                }}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/85 shadow-lg hover:shadow-xl transition-all duration-300 font-extrabold text-slate-800 text-xs cursor-pointer select-none group ${
                  inboxUnreadTotal > 0 ? "animate-pulse border-emerald-350" : ""
                }`}
              >
                <span>📥 Inbox</span>
                {inboxUnreadTotal > 0 && (
                  <span className="bg-green-700 text-white font-black px-2 py-0.5 rounded-full text-[9px] min-w-5 text-center font-sans">
                    {inboxUnreadTotal}
                  </span>
                )}
              </button>
            </div>

            {/* 2. PRIMARY ACTION — PLACE THIS FIRST */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setIsFormOpen(true)}
                className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-green-100/80 hover:shadow-lg text-xs uppercase tracking-wider"
              >
                <PlusCircle size={16} /> Report Lost Animal
              </Button>
              
              <Button
                onClick={() => {
                  setShowMyReportsView(true);
                  setShowInboxView(false);
                }}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-750 font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md text-xs uppercase tracking-wider"
              >
                📋 My Reports
              </Button>
            </div>

            {/* 3. FILTERS */}
            <div className="max-w-md">
              <LostFoundFilters filter={filter} setFilter={setFilter} />
            </div>

            {/* 4. ANIMAL REPORTS GRID */}
            <div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-3xl border border-slate-100 shadow-sm animate-fadeIn">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
                  <p className="text-xs font-semibold text-slate-500">Retrieving nearby sightings...</p>
                </div>
              ) : filteredPets.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-150 shadow-xs max-w-lg mx-auto space-y-3.5 my-6 animate-fadeIn">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center text-lg">
                    🐾
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800 leading-tight">
                      {filter === "lost"
                        ? "No lost animals reported yet."
                        : filter === "found"
                        ? "No found animals reported yet."
                        : "No reports posted yet."}
                    </h3>
                    <p className="text-[11px] text-slate-450 font-semibold leading-relaxed">
                      New reports will appear here and may help reunite an animal with their family.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fadeIn">
                  {filteredPets.map((pet) => (
                    <div key={pet.id} id={`report-card-${pet.id}`} className="h-full transition-all duration-300 rounded-3xl">
                      <AnimalReportCard pet={pet} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* 5. REPORT LOST ANIMAL FORM MODAL */}
      {isFormOpen && (
        <LostAnimalForm
          onClose={() => setIsFormOpen(false)}
          onSubmitSuccess={handleFormSubmitSuccess}
        />
      )}

      {/* 8. SUCCESSFUL SUBMISSION CONFIRMATION MODAL */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-scaleIn text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center animate-pulse">
              <Heart size={32} className="fill-red-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                🐾 Report Submitted
              </h2>
              <div className="text-slate-550 text-xs font-bold space-y-1.5 leading-relaxed">
                <p className="text-slate-800 font-extrabold text-sm">
                  You showed up. A life got a chance.
                </p>
                <p>Your report may help bring them home.</p>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessPopup(false)}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-2xl transition text-xs shadow-md shadow-green-100 cursor-pointer border border-green-700"
            >
              Continue to Lost & Found
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
