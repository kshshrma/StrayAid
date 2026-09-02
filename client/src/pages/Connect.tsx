import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  MessageSquare,
  Users,
  PhoneCall,
  ShieldCheck,
  X,
  Send,
  ArrowLeft,
  Paperclip,
  Info,
  CheckCheck,
  Check,
  AlertCircle,
  Clock,
  ExternalLink,
  MapPin,
  HeartHandshake
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  getRegisteredNgos,
  startNgoConversationOnBackend,
  sendMessageToConversation,
  markConversationAsReadOnBackend,
  type RegisteredNGO,
  type EmergencyHelpline,
  type ReportAttachmentMetadata,
} from "../services/lost-found/messageApiService";
import { getMyLostFoundPets } from "../services/lost-found/lostFoundService";
import type { LostFoundPet } from "../features/lost-found/AnimalReportCard";
import { getSocket } from "../services/socket";

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  metadata?: ReportAttachmentMetadata | any;
}

export default function Connect() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"groups" | "helplines">("groups");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // NGOs & Helplines data
  const [ngos, setNgos] = useState<RegisteredNGO[]>([]);
  const [helplines, setHelplines] = useState<EmergencyHelpline[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Active Chat States
  const [selectedNgo, setSelectedNgo] = useState<RegisteredNGO | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // NGO Details Modal
  const [showNgoModal, setShowNgoModal] = useState(false);

  // Attach Report Modal States
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [myReports, setMyReports] = useState<LostFoundPet[]>([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);

  // Typing Indicator
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState("");
  const typingTimeoutRef = useRef<any>(null);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Load Current User Session & Initial Data
  useEffect(() => {
    async function initUserAndData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUserId(session.user.id);
        }

        setLoadingData(true);
        const { ngos: fetchedNgos, helplines: fetchedHelplines } = await getRegisteredNgos();
        setNgos(fetchedNgos);
        setHelplines(fetchedHelplines);
      } catch (err) {
        console.error("Failed loading NGOs and helplines:", err);
      } finally {
        setLoadingData(false);
      }
    }

    initUserAndData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Auto-scroll Chat to Bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, selectedNgo]);

  // 3. Socket.IO Room Management & Listeners
  useEffect(() => {
    if (!activeConversationId) return;

    const socket = getSocket();

    // Join conversation room with security verification payload
    socket.emit("join_conversation_room", {
      conversationId: activeConversationId,
      userId: currentUserId,
    });

    const handleNewMessage = (data: { message: ChatMessage }) => {
      if (data?.message && data.message.conversationId === activeConversationId) {
        setMessages((prev) => {
          // Deduplicate message by ID
          if (prev.some((m) => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });

        // Mark read if it is an incoming message
        if (currentUserId && data.message.recipientId === currentUserId) {
          markConversationAsReadOnBackend(activeConversationId).catch(() => {});
        }
      }
    };

    const handleTypingStart = (data: { conversationId: string; userId: string; userName: string }) => {
      if (data.conversationId === activeConversationId && data.userId !== currentUserId) {
        setIsTyping(true);
        setTypingUserName(data.userName || "NGO Representative");
      }
    };

    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationId && data.userId !== currentUserId) {
        setIsTyping(false);
      }
    };

    const handleMessagesRead = (data: { conversationId: string; readerId: string }) => {
      if (data.conversationId === activeConversationId && data.readerId !== currentUserId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === currentUserId ? { ...m, isRead: true } : m))
        );
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
    };
  }, [activeConversationId, currentUserId]);

  // 4. Handle Join Chat for Selected NGO
  async function handleJoinChat(ngo: RegisteredNGO) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert("Please log in to start a private chat with registered NGOs.");
      navigate("/login");
      return;
    }

    try {
      setSelectedNgo(ngo);
      setLoadingChat(true);
      setChatError(null);
      setMessages([]);

      // Start or get existing conversation between user and this NGO
      const result = await startNgoConversationOnBackend(ngo.id);
      
      if (result.conversation) {
        setActiveConversationId(result.conversation.id);
        setMessages(result.messages || []);
        
        // Mark existing unread messages as read
        markConversationAsReadOnBackend(result.conversation.id).catch(() => {});
      }
    } catch (err: any) {
      console.error("Error opening NGO chat:", err);
      setChatError(err.message || "Failed to load conversation. Please try again.");
    } finally {
      setLoadingChat(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }

  // 5. Send Text Message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !activeConversationId || sendingMessage) return;

    const textToSend = messageText.trim();
    setMessageText("");
    setSendingMessage(true);

    // Stop typing indicator on socket
    const socket = getSocket();
    socket.emit("typing_stop", {
      conversationId: activeConversationId,
      userId: currentUserId,
    });

    try {
      const createdMessage = await sendMessageToConversation(activeConversationId, textToSend);
      if (createdMessage) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === createdMessage.id)) return prev;
          return [...prev, createdMessage];
        });
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert("Failed to deliver message. Please check your network connection.");
    } finally {
      setSendingMessage(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  // 6. Handle Typing Status Broadcast
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessageText(e.target.value);

    if (!activeConversationId || !currentUserId) return;

    const socket = getSocket();
    socket.emit("typing_start", {
      conversationId: activeConversationId,
      userId: currentUserId,
      userName: "User",
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", {
        conversationId: activeConversationId,
        userId: currentUserId,
      });
    }, 1800);
  }

  // 7. Open Report Picker
  async function handleOpenReportPicker() {
    setShowReportPicker(true);
    setLoadingMyReports(true);
    try {
      const pets = await getMyLostFoundPets();
      setMyReports(pets);
    } catch (err) {
      console.error("Error loading user reports for attachment:", err);
    } finally {
      setLoadingMyReports(false);
    }
  }

  // 8. Attach and Send Report to NGO
  async function handleAttachReport(pet: LostFoundPet) {
    if (!activeConversationId || sendingMessage) return;

    setShowReportPicker(false);
    setSendingMessage(true);

    const metadata: ReportAttachmentMetadata = {
      type: "report_attachment",
      reportId: pet.id,
      animalType: pet.animal,
      breed: pet.breed,
      status: pet.type,
      location: pet.location,
      urgency: pet.urgency || "Normal",
      imageUrl: pet.image || undefined,
    };

    const contentText = `Shared Lost & Found Report: ${pet.name ? `${pet.name} (${pet.breed || pet.animal})` : (pet.breed || pet.animal)}`;

    try {
      const createdMessage = await sendMessageToConversation(activeConversationId, contentText, metadata);
      if (createdMessage) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === createdMessage.id)) return prev;
          return [...prev, createdMessage];
        });
      }
    } catch (err) {
      console.error("Failed to attach and send report:", err);
      alert("Failed to send report. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  }

  // Helper for Formatting Timestamps
  function formatMessageTime(isoString: string): string {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  // Helper for Availability Status
  function renderAvailabilityBadge(status: "available" | "busy" | "offline") {
    switch (status) {
      case "available":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Available
          </span>
        );
      case "busy":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Busy
          </span>
        );
      case "offline":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Offline
          </span>
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 pb-28 relative font-sans animate-fadeIn">
      
      {/* 1. Page Header */}
      <div className="max-w-4xl mx-auto mb-6 text-center space-y-1">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <HeartHandshake className="text-green-700 shrink-0" size={36} /> Connect
        </h1>
        <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto">
          Coordinate with registered NGOs, veterinary networks, and 24/7 emergency rescue helplines.
        </p>
      </div>

      {/* 2. Main Tab Switcher */}
      <div className="max-w-md mx-auto mb-6 flex gap-2 p-1 bg-slate-200/60 rounded-2xl">
        <button
          onClick={() => {
            setActiveTab("groups");
            setSelectedNgo(null);
            setActiveConversationId(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "groups"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MessageSquare size={14} /> Registered NGOs
        </button>
        <button
          onClick={() => {
            setActiveTab("helplines");
            setSelectedNgo(null);
            setActiveConversationId(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "helplines"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <PhoneCall size={14} /> Emergency Helplines
        </button>
      </div>

      {/* 3. Main Body: Registered NGOs List or Helplines List */}
      <div className="max-w-4xl mx-auto">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-3xl border border-slate-100 shadow-xs">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
            <p className="text-xs font-semibold text-slate-500">Loading registered organizations...</p>
          </div>
        ) : activeTab === "groups" ? (
          /* Registered NGOs Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ngos.map((ngo) => (
              <Card
                key={ngo.id}
                className="flex flex-col justify-between p-5 rounded-3xl border border-slate-150/80 bg-white shadow-xs hover:shadow-md transition-all duration-300 relative group"
              >
                <div className="space-y-3">
                  {/* NGO Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center font-black text-lg border border-green-100 shrink-0">
                      🐾
                    </div>
                    {renderAvailabilityBadge(ngo.availability)}
                  </div>

                  {/* Title & Verified Badge */}
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight group-hover:text-green-750 transition-colors">
                      {ngo.name}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                        <ShieldCheck size={11} className="text-sky-600" />
                        Verified NGO
                      </span>
                    </div>
                  </div>

                  {/* Location & Categories */}
                  <div className="space-y-2 pt-1 border-t border-slate-50">
                    <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{ngo.location}</span>
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {ngo.categories.slice(0, 3).map((cat, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-bold bg-slate-100 text-slate-650 px-2 py-0.5 rounded-lg"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {ngo.description}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Rescuers count + Join Chat button */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-450 flex items-center gap-1">
                    <Users size={13} /> {ngo.activeMembers} Rescuers
                  </span>

                  <Button
                    onClick={() => handleJoinChat(ngo)}
                    className="py-2 px-4 text-xs font-extrabold bg-green-700 hover:bg-green-800 text-white rounded-xl cursor-pointer shadow-sm shadow-green-100 transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare size={13} /> Join Chat
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Emergency Helplines Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {helplines.map((helpline) => (
              <Card
                key={helpline.id}
                className="flex flex-col justify-between p-5 rounded-3xl border border-slate-150/80 bg-white shadow-xs hover:shadow-md transition-all duration-300"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black text-lg border border-red-100">
                      🚑
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Available 24/7
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">
                      {helpline.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      {helpline.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-600">
                    📞 {helpline.phone}
                  </span>

                  <a href={`tel:${helpline.phone}`}>
                    <Button className="py-2 px-4 text-xs font-extrabold bg-green-700 hover:bg-green-800 text-white rounded-xl flex items-center gap-1.5 shadow-sm shadow-green-100 cursor-pointer">
                      <PhoneCall size={13} /> Call Now
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 4. REAL 1-ON-1 NGO CHAT DRAWER / WORKSPACE (Instagram/WhatsApp DM Style) */}
      {selectedNgo && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl animate-slideLeft">
            
            {/* A. Chat Header */}
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setSelectedNgo(null);
                    setActiveConversationId(null);
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-xl transition text-slate-600 cursor-pointer shrink-0"
                  title="Back to NGO list"
                >
                  <ArrowLeft size={18} />
                </button>

                {/* NGO Avatar / Icon */}
                <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-800 flex items-center justify-center font-black text-base shrink-0 border border-green-200/60 relative">
                  🐾
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      selectedNgo.availability === "available"
                        ? "bg-emerald-500"
                        : selectedNgo.availability === "busy"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                    }`}
                  />
                </div>

                {/* NGO Details Header Text */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {selectedNgo.name}
                    </h3>
                    <ShieldCheck size={14} className="text-sky-600 shrink-0" title="Verified NGO" />
                  </div>
                  
                  <div className="flex items-center gap-2 mt-0.5">
                    {renderAvailabilityBadge(selectedNgo.availability)}
                    <span className="text-[10px] text-slate-400 font-bold truncate">
                      📍 {selectedNgo.location.split("&")[0]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Info & Close */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setShowNgoModal(true)}
                  className="p-2 hover:bg-slate-200/80 rounded-xl transition text-slate-500 hover:text-slate-800 cursor-pointer"
                  title="View NGO details"
                >
                  <Info size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectedNgo(null);
                    setActiveConversationId(null);
                  }}
                  className="p-2 hover:bg-slate-200/80 rounded-xl transition text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Close chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* B. Chat Messages Feed (Instagram/WhatsApp Aligned) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
              
              {/* Channel Security Banner */}
              <div className="text-[10px] text-center text-slate-500 bg-white/80 border border-slate-100 shadow-2xs py-1.5 px-3 rounded-2xl w-max max-w-xs mx-auto font-bold flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} className="text-green-700" />
                <span>Verified Rescue Channel • End-to-End Logged</span>
              </div>

              {loadingChat ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2.5 text-slate-400 text-xs font-bold animate-pulse">
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-green-700 border-t-transparent" />
                  <span>Loading message history...</span>
                </div>
              ) : chatError ? (
                <div className="text-center p-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs font-semibold space-y-2">
                  <AlertCircle className="mx-auto" size={20} />
                  <p>{chatError}</p>
                  <Button
                    onClick={() => handleJoinChat(selectedNgo)}
                    className="py-1 px-3 text-xs bg-red-600 text-white rounded-lg"
                  >
                    Retry
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                /* Empty Chat Welcome Card */
                <div className="text-center py-12 px-4 space-y-3 bg-white rounded-3xl border border-slate-150/80 shadow-xs max-w-sm mx-auto my-auto animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center font-black text-xl mx-auto border border-green-100">
                    🐾
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-800">
                      Start a conversation
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      You are connected with <span className="font-bold text-slate-700">{selectedNgo.name}</span>.
                      Ask about rescue help, animal emergencies, or share a Lost & Found report.
                    </p>
                  </div>
                </div>
              ) : (
                /* Render Messages with STRICT senderId-based Alignment */
                messages.map((msg) => {
                  const isOutgoing = msg.senderId === currentUserId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex w-full ${
                        isOutgoing ? "justify-end" : "justify-start"
                      } animate-fadeIn`}
                    >
                      <div
                        className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-3 shadow-xs text-xs leading-relaxed space-y-2 ${
                          isOutgoing
                            ? "bg-green-700 text-white rounded-tr-xs shadow-green-100"
                            : "bg-white border border-slate-200 text-slate-850 rounded-tl-xs"
                        }`}
                      >
                        {/* 1. Report Attachment Card (if attached) */}
                        {msg.metadata && msg.metadata.type === "report_attachment" && (
                          <div
                            className={`rounded-xl p-2.5 border space-y-2 text-left ${
                              isOutgoing
                                ? "bg-green-800/60 border-green-600/60 text-white"
                                : "bg-slate-50 border-slate-200/80 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 border-b pb-1.5 border-inherit">
                              <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                🐕 Lost & Found Report
                              </span>
                              <span
                                className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                                  msg.metadata.status === "lost"
                                    ? "bg-red-500 text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {msg.metadata.status || "Report"}
                              </span>
                            </div>

                            {msg.metadata.imageUrl && (
                              <img
                                src={msg.metadata.imageUrl}
                                alt="Animal"
                                className="w-full h-28 object-cover rounded-lg border border-slate-200/40"
                              />
                            )}

                            <div className="space-y-0.5">
                              <h5 className="font-extrabold text-[11px] truncate">
                                {msg.metadata.breed
                                  ? `${msg.metadata.animalType || "Animal"} • ${msg.metadata.breed}`
                                  : msg.metadata.animalType || "Animal"}
                              </h5>
                              <p
                                className={`text-[10px] truncate ${
                                  isOutgoing ? "text-green-100" : "text-slate-500"
                                }`}
                              >
                                📍 {msg.metadata.location || "Location not provided"}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                if (msg.metadata.reportId) {
                                  navigate("/lost-found");
                                }
                              }}
                              className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 transition cursor-pointer ${
                                isOutgoing
                                  ? "bg-white text-green-800 hover:bg-green-50"
                                  : "bg-green-700 text-white hover:bg-green-800"
                              }`}
                            >
                              <span>View Report</span>
                              <ExternalLink size={10} />
                            </button>
                          </div>
                        )}

                        {/* 2. Text Message Content */}
                        <p className="whitespace-pre-wrap break-words font-medium">
                          {msg.content}
                        </p>

                        {/* 3. Timestamp & Read Checkmark */}
                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] font-bold ${
                            isOutgoing ? "text-green-200" : "text-slate-400"
                          }`}
                        >
                          <span>{formatMessageTime(msg.createdAt)}</span>
                          {isOutgoing && (
                            <span>
                              {msg.isRead ? (
                                <CheckCheck size={12} className="text-emerald-200" />
                              ) : (
                                <Check size={12} className="text-green-200" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing Indicator Bubble */}
              {isTyping && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-xs px-3.5 py-2 text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs">
                    <span>{typingUserName} is typing</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messageEndRef} />
            </div>

            {/* C. Chat Composer (Sticky Bottom) */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0 shadow-sm"
            >
              {/* Attach Report Button */}
              <button
                type="button"
                onClick={handleOpenReportPicker}
                className="p-2.5 text-slate-500 hover:text-green-750 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
                title="Attach Lost & Found Report"
              >
                <Paperclip size={17} />
              </button>

              {/* Message Input */}
              <input
                ref={inputRef}
                type="text"
                placeholder="Write a message..."
                value={messageText}
                onChange={handleInputChange}
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!messageText.trim() || sendingMessage}
                className="p-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shadow-green-100"
                title="Send Message"
              >
                <Send size={15} />
              </button>
            </form>

          </div>
        </div>
      )}

      {/* 5. NGO PROFILE & DETAILS MODAL */}
      {showNgoModal && selectedNgo && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center font-black text-base border border-green-100">
                  🐾
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedNgo.name}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-sky-700 font-bold">
                    <ShieldCheck size={12} className="text-sky-600" /> Verified NGO
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowNgoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div>
                <span className="font-extrabold text-slate-800 block mb-0.5">Description:</span>
                <p>{selectedNgo.description}</p>
              </div>

              <div>
                <span className="font-extrabold text-slate-800 block mb-0.5">Service Area:</span>
                <p>{selectedNgo.serviceArea}</p>
              </div>

              <div>
                <span className="font-extrabold text-slate-800 block mb-1">Rescue Focus:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedNgo.categories.map((cat, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-lg border border-green-100"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Helpline Contact</span>
                  <span className="text-xs font-bold text-slate-800">{selectedNgo.phone}</span>
                </div>
                <a href={`tel:${selectedNgo.phone}`}>
                  <Button className="py-1.5 px-3 text-xs bg-green-700 text-white rounded-xl">
                    <PhoneCall size={12} className="mr-1" /> Call NGO
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. ATTACH LOST & FOUND REPORT PICKER MODAL */}
      {showReportPicker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip size={14} className="text-green-700" /> Select Report to Attach
              </h3>
              <button
                onClick={() => setShowReportPicker(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingMyReports ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 text-xs font-bold">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
                  <span>Loading your reports...</span>
                </div>
              ) : myReports.length === 0 ? (
                <div className="text-center py-8 px-4 text-slate-400 text-xs space-y-2">
                  <p className="font-bold">No active Lost & Found reports created yet.</p>
                  <Button
                    onClick={() => {
                      setShowReportPicker(false);
                      navigate("/lost-found");
                    }}
                    className="py-1 px-3 text-xs bg-green-700 text-white rounded-lg mx-auto"
                  >
                    Create Report First
                  </Button>
                </div>
              ) : (
                myReports.map((pet) => (
                  <div
                    key={pet.id}
                    onClick={() => handleAttachReport(pet)}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-green-600 hover:bg-green-50/40 transition-all cursor-pointer flex items-center gap-3 group"
                  >
                    {pet.image ? (
                      <img
                        src={pet.image}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg shrink-0">
                        🐾
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-green-800">
                          {pet.name ? `${pet.name} (${pet.breed || pet.animal})` : (pet.breed || pet.animal)}
                        </h4>
                        <span
                          className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                            pet.type === "lost" ? "bg-red-500 text-white" : "bg-emerald-600 text-white"
                          }`}
                        >
                          {pet.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                        📍 {pet.address || pet.location}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
