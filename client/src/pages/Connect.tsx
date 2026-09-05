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
  MapPin,
  HeartHandshake,
  Bot,
  RotateCcw,
  ExternalLink
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
import { CHATBOT_FLOW_CONFIG, type ChatOption } from "../services/connect/chatbotFlow";
import { createBotRescueRequestOnBackend } from "../services/connect/rescueRequestService";
import { uploadImage } from "../services/storage/uploadImage";

// Real-time Chat DM Message Interface
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

// Automated Bot Message Interface
interface BotConversationMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  options?: ChatOption[];
  imageUrl?: string;
  isSuccess?: boolean;
  isError?: boolean;
}

export default function Connect() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"groups" | "helplines">("groups");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // NGOs & Helplines data
  const [ngos, setNgos] = useState<RegisteredNGO[]>([]);
  const [helplines, setHelplines] = useState<EmergencyHelpline[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selected NGO & Mode
  const [selectedNgo, setSelectedNgo] = useState<RegisteredNGO | null>(null);
  const [chatMode, setChatMode] = useState<"bot" | "live">("bot");

  // Automated Chatbot State
  const [botMessages, setBotMessages] = useState<BotConversationMessage[]>([]);
  const [currentBotStep, setCurrentBotStep] = useState<string>("MAIN_MENU");
  const [selectedRescueType, setSelectedRescueType] = useState<"injured_animal" | "trapped_animal" | "weak_abandoned_baby" | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<string | null>(null);
  const [selectedInDanger, setSelectedInDanger] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLocationText, setManualLocationText] = useState("");
  const [manualLocationSubmitting, setManualLocationSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);
  const [requestLock, setRequestLock] = useState(false); // Duplicate click protection

  // Live Human Chat States
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Modals
  const [showNgoModal, setShowNgoModal] = useState(false);
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [myReports, setMyReports] = useState<LostFoundPet[]>([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);

  // Typing Indicator for Live Chat
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState("");

  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Current User Session & Initial NGOs Data
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
  }, [botMessages, messages, isTyping, showManualInput, selectedNgo, chatMode]);

  // 3. Socket.IO Room Management for Live Chat Mode
  useEffect(() => {
    if (!activeConversationId) return;

    const socket = getSocket();

    // Join conversation room with verification payload
    socket.emit("join_conversation_room", {
      conversationId: activeConversationId,
      userId: currentUserId,
    });

    const handleNewMessage = (data: { message: ChatMessage }) => {
      if (data?.message && data.message.conversationId === activeConversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });

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

  // 4. Initialize Automated Chatbot when NGO is selected
  function initChatbotForNgo(ngo: RegisteredNGO) {
    setSelectedNgo(ngo);
    setChatMode("bot");
    setCurrentBotStep("MAIN_MENU");
    setSelectedRescueType(null);
    setSelectedSubType(null);
    setSelectedInDanger(false);
    setShowManualInput(false);
    setBotError(null);

    const initialStep = CHATBOT_FLOW_CONFIG["MAIN_MENU"];
    const initialText = typeof initialStep.message === "function"
      ? initialStep.message({ ngoName: ngo.name, ngoLocation: ngo.location })
      : initialStep.message;

    const initialBotMessage: BotConversationMessage = {
      id: "msg_init_" + Date.now(),
      sender: "bot",
      text: initialText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      options: initialStep.options,
    };

    setBotMessages([initialBotMessage]);
  }

  // 5. Reset to Main Menu
  function handleResetToMainMenu() {
    if (!selectedNgo) return;
    setCurrentBotStep("MAIN_MENU");
    setSelectedRescueType(null);
    setSelectedSubType(null);
    setSelectedInDanger(false);
    setShowManualInput(false);
    setBotError(null);

    const mainStep = CHATBOT_FLOW_CONFIG["MAIN_MENU"];
    const text = typeof mainStep.message === "function"
      ? mainStep.message({ ngoName: selectedNgo.name, ngoLocation: selectedNgo.location })
      : mainStep.message;

    const botMsg: BotConversationMessage = {
      id: "msg_reset_" + Date.now(),
      sender: "bot",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      options: mainStep.options,
    };

    setBotMessages((prev) => [...prev, botMsg]);
  }

  // 6. Handle User Selecting an Automated Option
  async function handleOptionSelect(option: ChatOption) {
    if (!selectedNgo || requestLock) return;

    // 1. Add User selection bubble
    const userMsg: BotConversationMessage = {
      id: "user_" + Date.now(),
      sender: "user",
      text: option.label,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setBotMessages((prev) => [...prev, userMsg]);
    setBotError(null);

    // Track rescue context if present
    if (option.rescueType) setSelectedRescueType(option.rescueType);
    if (option.subType) setSelectedSubType(option.subType);
    if (option.inDanger !== undefined) setSelectedInDanger(option.inDanger);

    // Check for special actions
    if (option.action) {
      switch (option.action) {
        case "send_current_location":
          await handleSendCurrentLocation(option.rescueType || selectedRescueType || "injured_animal", option.subType || selectedSubType, option.inDanger !== undefined ? option.inDanger : selectedInDanger);
          return;

        case "prompt_manual_location":
          setShowManualInput(true);
          const promptMsg: BotConversationMessage = {
            id: "bot_prompt_" + Date.now(),
            sender: "bot",
            text: "Please enter the animal's location.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setBotMessages((prev) => [...prev, promptMsg]);
          return;

        case "get_directions":
          const query = encodeURIComponent(`${selectedNgo.location || selectedNgo.name}`);
          window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
          return;

        case "prompt_photo_upload":
          fileInputRef.current?.click();
          return;

        case "contact_ngo":
          await switchToLiveChat();
          return;

        case "navigate_guardian":
          navigate("/guardian");
          return;

        case "show_donation_info":
          const donateMsg: BotConversationMessage = {
            id: "bot_don_" + Date.now(),
            sender: "bot",
            text: `💳 You can support ${selectedNgo.name} directly:\n\nHelpline / UPI: ${selectedNgo.phone}\nService Area: ${selectedNgo.serviceArea}\n\nThank you for saving stray lives! ❤️`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            options: [{ id: "opt_mm_dondone", label: "🏠 Main Menu", nextStep: "MAIN_MENU" }],
          };
          setBotMessages((prev) => [...prev, donateMsg]);
          return;

        case "main_menu":
          handleResetToMainMenu();
          return;
      }
    }

    // Standard State Transition
    if (option.nextStep) {
      const nextStepConfig = CHATBOT_FLOW_CONFIG[option.nextStep];
      if (!nextStepConfig) {
        handleResetToMainMenu();
        return;
      }

      setCurrentBotStep(option.nextStep);
      const nextText = typeof nextStepConfig.message === "function"
        ? nextStepConfig.message({ ngoName: selectedNgo.name, ngoLocation: selectedNgo.location })
        : nextStepConfig.message;

      const nextBotMsg: BotConversationMessage = {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: nextText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        options: nextStepConfig.options,
      };

      setBotMessages((prev) => [...prev, nextBotMsg]);
    }
  }

  // 7. Handle Send Current Geolocation
  async function handleSendCurrentLocation(rescueType: "injured_animal" | "trapped_animal" | "weak_abandoned_baby", subType?: string | null, inDanger?: boolean) {
    if (!selectedNgo || requestLock) return;

    if (!navigator.geolocation) {
      setBotError("Geolocation is not supported by your browser. Please enter location manually.");
      setShowManualInput(true);
      return;
    }

    setLocationLoading(true);
    setRequestLock(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Send to backend rescue request API
          const res = await createBotRescueRequestOnBackend({
            ngoId: selectedNgo.id,
            rescueType,
            subType: subType || null,
            latitude,
            longitude,
            inDanger: inDanger || false,
          });

          if (res.conversationId) {
            setActiveConversationId(res.conversationId);
          }

          const successText = inDanger
            ? "🚨 Rescue team notified.\n\nPlease keep yourself and the animal safe until help arrives."
            : rescueType === "trapped_animal"
            ? "📍 Location sent.\n\nThe rescue team has been notified and will arrange assistance."
            : "📍 Location sent to the rescue team.\n\nThe NGO will arrange transport and contact you shortly.";

          const botSuccessMsg: BotConversationMessage = {
            id: "bot_loc_succ_" + Date.now(),
            sender: "bot",
            text: successText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isSuccess: true,
            options: [
              { id: "opt_contact_succ", label: "📞 Contact NGO", action: "contact_ngo" },
              { id: "opt_mm_succ", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
            ],
          };

          setBotMessages((prev) => [...prev, botSuccessMsg]);
        } catch (err: any) {
          console.error("Failed to send rescue request:", err);
          const errorMsg: BotConversationMessage = {
            id: "bot_err_" + Date.now(),
            sender: "bot",
            text: "We couldn't send the rescue request. Please try again or enter the location manually.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isError: true,
            options: [
              { id: "opt_try_again_loc", label: "🔄 Try Again", action: "send_current_location", rescueType, subType: subType || undefined, inDanger },
              { id: "opt_man_fallback", label: "🗺️ Enter Location Manually", action: "prompt_manual_location", rescueType, subType: subType || undefined, inDanger },
              { id: "opt_mm_err", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
            ],
          };
          setBotMessages((prev) => [...prev, errorMsg]);
        } finally {
          setLocationLoading(false);
          setRequestLock(false);
        }
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setLocationLoading(false);
        setRequestLock(false);
        setBotError("Unable to get your location. Please enter it manually.");
        setShowManualInput(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // 8. Handle Manual Location Submit
  async function handleManualLocationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualLocationText.trim() || !selectedNgo || manualLocationSubmitting) return;

    const locationString = manualLocationText.trim();
    setManualLocationSubmitting(true);
    setShowManualInput(false);
    setManualLocationText("");

    // Add user message with entered location
    const userLocMsg: BotConversationMessage = {
      id: "user_loc_" + Date.now(),
      sender: "user",
      text: `📍 Location: ${locationString}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setBotMessages((prev) => [...prev, userLocMsg]);

    try {
      const res = await createBotRescueRequestOnBackend({
        ngoId: selectedNgo.id,
        rescueType: selectedRescueType || "injured_animal",
        subType: selectedSubType || null,
        manualLocation: locationString,
        inDanger: selectedInDanger,
      });

      if (res.conversationId) {
        setActiveConversationId(res.conversationId);
      }

      const successText = selectedInDanger
        ? "🚨 Rescue team notified.\n\nPlease keep yourself and the animal safe until help arrives."
        : selectedRescueType === "trapped_animal"
        ? "📍 Location sent.\n\nThe rescue team has been notified and will arrange assistance."
        : "📍 Location sent to the rescue team.\n\nThe NGO will arrange transport and contact you shortly.";

      const botSuccessMsg: BotConversationMessage = {
        id: "bot_man_succ_" + Date.now(),
        sender: "bot",
        text: successText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isSuccess: true,
        options: [
          { id: "opt_contact_man_succ", label: "📞 Contact NGO", action: "contact_ngo" },
          { id: "opt_mm_man_succ", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
        ],
      };

      setBotMessages((prev) => [...prev, botSuccessMsg]);
    } catch (err) {
      console.error("Manual location submit failed:", err);
      const errorMsg: BotConversationMessage = {
        id: "bot_man_err_" + Date.now(),
        sender: "bot",
        text: "We couldn't submit your location. Please check your connection and try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
        options: [
          { id: "opt_try_again_man", label: "🔄 Try Again", action: "prompt_manual_location" },
          { id: "opt_mm_man_err", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
        ],
      };
      setBotMessages((prev) => [...prev, errorMsg]);
    } finally {
      setManualLocationSubmitting(false);
    }
  }

  // 9. Handle Photo Upload for Baby Animal
  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length || !selectedNgo || photoUploading) return;
    const file = e.target.files[0];
    setPhotoUploading(true);

    try {
      const imageUrl = await uploadImage(file);

      // Add user photo bubble
      const userPhotoMsg: BotConversationMessage = {
        id: "user_photo_" + Date.now(),
        sender: "user",
        text: "📷 Uploaded photo of baby animal",
        imageUrl,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setBotMessages((prev) => [...prev, userPhotoMsg]);

      // Create rescue request with image
      const res = await createBotRescueRequestOnBackend({
        ngoId: selectedNgo.id,
        rescueType: "weak_abandoned_baby",
        imageUrl,
        inDanger: false,
      });

      if (res.conversationId) {
        setActiveConversationId(res.conversationId);
      }

      const botPhotoSucc: BotConversationMessage = {
        id: "bot_photo_succ_" + Date.now(),
        sender: "bot",
        text: "Thank you. The rescue team has received the information and photo.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isSuccess: true,
        options: [
          { id: "opt_contact_photo_succ", label: "📞 Contact NGO", action: "contact_ngo" },
          { id: "opt_mm_photo_succ", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
        ],
      };
      setBotMessages((prev) => [...prev, botPhotoSucc]);
    } catch (err) {
      console.error("Photo upload failed:", err);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  }

  // 10. Switch to Live 1-on-1 NGO DM Chat
  async function switchToLiveChat() {
    if (!selectedNgo) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert("Please log in to chat with NGO coordinators.");
      navigate("/login");
      return;
    }

    try {
      setLoadingChat(true);
      setChatError(null);
      setChatMode("live");

      const result = await startNgoConversationOnBackend(selectedNgo.id);
      if (result.conversation) {
        setActiveConversationId(result.conversation.id);
        setMessages(result.messages || []);
        markConversationAsReadOnBackend(result.conversation.id).catch(() => {});
      }
    } catch (err: any) {
      console.error("Error switching to live chat:", err);
      setChatError(err.message || "Failed to load live chat. Please try again.");
    } finally {
      setLoadingChat(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }

  // 11. Send Message in Live DM Mode
  async function handleSendLiveMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !activeConversationId || sendingMessage) return;

    const textToSend = messageText.trim();
    setMessageText("");
    setSendingMessage(true);

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

  // 12. Open Report Picker
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

  // 13. Attach and Send Report to NGO
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
      
      {/* Hidden File Input for Baby Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelected}
        className="hidden"
      />

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

                {/* Card Footer: Rescuers count + Connect / Join Chat button */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-450 flex items-center gap-1">
                    <Users size={13} /> {ngo.activeMembers} Rescuers
                  </span>

                  <Button
                    onClick={() => initChatbotForNgo(ngo)}
                    className="py-2 px-4 text-xs font-extrabold bg-green-700 hover:bg-green-800 text-white rounded-xl cursor-pointer shadow-sm shadow-green-100 transition-all flex items-center gap-1.5"
                  >
                    <Bot size={13} /> Connect
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

      {/* 4. AUTOMATED NGO CHATBOT & LIVE DM DRAWER (Modern Mobile UI) */}
      {selectedNgo && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-[100dvh] flex flex-col shadow-2xl animate-slideLeft overflow-hidden">
            
            {/* A. Chat Header */}
            <div className="px-4 py-3 border-b border-slate-150 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setSelectedNgo(null);
                    setActiveConversationId(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-600 cursor-pointer shrink-0"
                  title="Back to NGO list"
                >
                  <ArrowLeft size={18} />
                </button>

                {/* NGO Avatar / Icon with status dot */}
                <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-800 flex items-center justify-center font-black text-base shrink-0 border border-green-200/60 relative">
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

                {/* NGO Title & Status */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {selectedNgo.name}
                    </h3>
                    <ShieldCheck size={14} className="text-sky-600 shrink-0" />
                  </div>
                  
                  <div className="flex items-center gap-2 mt-0.5">
                    {renderAvailabilityBadge(selectedNgo.availability)}
                    <span className="text-[10px] text-slate-400 font-bold truncate">
                      📍 {selectedNgo.location.split("&")[0]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode Toggle & Info Action */}
              <div className="flex items-center gap-1 shrink-0">
                {chatMode === "bot" ? (
                  <button
                    onClick={switchToLiveChat}
                    className="py-1 px-2.5 bg-green-50 hover:bg-green-100 text-green-800 text-[10px] font-black rounded-xl border border-green-200 transition cursor-pointer flex items-center gap-1"
                    title="Switch to live NGO coordinator"
                  >
                    <MessageSquare size={11} /> Live Chat
                  </button>
                ) : (
                  <button
                    onClick={() => setChatMode("bot")}
                    className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1"
                    title="Switch to automated helper"
                  >
                    <Bot size={11} /> Bot Guide
                  </button>
                )}

                <button
                  onClick={() => setShowNgoModal(true)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-500 cursor-pointer"
                  title="View NGO details"
                >
                  <Info size={17} />
                </button>
                <button
                  onClick={() => {
                    setSelectedNgo(null);
                    setActiveConversationId(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Close chat"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Verification Channel Banner */}
            <div className="bg-slate-50 border-b border-slate-100 py-1 px-4 text-center">
              <span className="text-[10px] font-black text-slate-500 flex items-center justify-center gap-1">
                <ShieldCheck size={11} className="text-green-700" />
                Verified Rescue Channel • End-to-End Logged
              </span>
            </div>

            {/* B. CHAT CONTENT: MODE 1 (AUTOMATED GUIDED BOT) OR MODE 2 (LIVE DM) */}
            {chatMode === "bot" ? (
              /* =========================================================================
                 AUTOMATED GUIDED DECISION-TREE BOT
                 ========================================================================= */
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                
                {/* Messages Feed (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
                  {botMessages.map((msg) => {
                    const isUser = msg.sender === "user";
                    return (
                      <div
                        key={msg.id}
                        className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-fadeIn`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 shadow-xs text-xs leading-relaxed space-y-2 ${
                            isUser
                              ? "bg-green-700 text-white rounded-tr-xs shadow-green-100 font-semibold"
                              : msg.isSuccess
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-tl-xs font-semibold"
                              : msg.isError
                              ? "bg-red-50 border border-red-200 text-red-950 rounded-tl-xs font-semibold"
                              : "bg-white border border-slate-200 text-slate-850 rounded-tl-xs font-medium"
                          }`}
                        >
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Animal"
                              className="w-full h-36 object-cover rounded-xl border border-slate-200"
                            />
                          )}

                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          
                          <div
                            className={`text-[9px] font-bold text-right ${
                              isUser ? "text-green-200" : "text-slate-400"
                            }`}
                          >
                            {msg.time}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Geolocation Loading Indicator */}
                  {locationLoading && (
                    <div className="flex justify-start animate-fadeIn">
                      <div className="bg-white border border-green-200 text-green-900 rounded-2xl rounded-tl-xs p-3 text-xs font-bold flex items-center gap-2 shadow-xs">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
                        <span>🛰️ Acquiring GPS location & dispatching rescue...</span>
                      </div>
                    </div>
                  )}

                  {/* Photo Uploading Indicator */}
                  {photoUploading && (
                    <div className="flex justify-start animate-fadeIn">
                      <div className="bg-white border border-green-200 text-green-900 rounded-2xl rounded-tl-xs p-3 text-xs font-bold flex items-center gap-2 shadow-xs">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
                        <span>📷 Uploading photo & registering request...</span>
                      </div>
                    </div>
                  )}

                  {/* Fallback Manual Location Prompt Input */}
                  {showManualInput && (
                    <form
                      onSubmit={handleManualLocationSubmit}
                      className="bg-white border border-green-300 rounded-2xl p-3 shadow-md space-y-2 animate-fadeIn"
                    >
                      <label className="block text-[11px] font-black text-slate-800">
                        📍 Enter Animal's Exact Location:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sector 62, Greater Noida near Metro Pillar 42"
                        value={manualLocationText}
                        onChange={(e) => setManualLocationText(e.target.value)}
                        autoFocus
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowManualInput(false)}
                          className="py-1.5 px-3 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <Button
                          type="submit"
                          disabled={!manualLocationText.trim() || manualLocationSubmitting}
                          className="py-1.5 px-4 text-xs font-extrabold bg-green-700 text-white rounded-xl shadow-xs"
                        >
                          {manualLocationSubmitting ? "Submitting..." : "Send Location"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {botError && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-900 flex items-center gap-1.5 animate-fadeIn">
                      <AlertCircle size={14} className="text-amber-600 shrink-0" />
                      <span>{botError}</span>
                    </div>
                  )}

                  <div ref={messageEndRef} />
                </div>

                {/* Bottom Quick-Reply Selectable Options (Pinned Footer) */}
                <div className="p-3.5 border-t border-slate-150 bg-white space-y-2.5 shrink-0 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Select an option:
                    </span>
                    <button
                      onClick={handleResetToMainMenu}
                      className="text-[10px] font-bold text-slate-500 hover:text-green-800 flex items-center gap-1 cursor-pointer transition py-0.5 px-1.5 rounded-md hover:bg-slate-100"
                    >
                      <RotateCcw size={11} /> Reset Menu
                    </button>
                  </div>

                  {/* Render Current Active Options */}
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-0.5">
                    {(() => {
                      const latestBotMsgWithOptions = [...botMessages].reverse().find((m) => m.sender === "bot" && m.options && m.options.length > 0);
                      const currentOptions = latestBotMsgWithOptions?.options || CHATBOT_FLOW_CONFIG[currentBotStep]?.options || [];

                      return currentOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={locationLoading || photoUploading || requestLock}
                          onClick={() => handleOptionSelect(opt)}
                          className={`py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                            opt.label.includes("Main Menu")
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                              : opt.label.includes("Contact NGO")
                              ? "bg-sky-600 hover:bg-sky-700 text-white border border-sky-600 shadow-sky-100"
                              : opt.label.includes("Rescue") || opt.label.includes("Injured") || opt.label.includes("Danger") || opt.label.includes("Send")
                              ? "bg-green-700 hover:bg-green-800 text-white border border-green-700 hover:scale-[1.02] shadow-green-100"
                              : "bg-white hover:bg-green-50 text-slate-800 hover:text-green-800 border border-slate-200 hover:border-green-300"
                          }`}
                        >
                          <span>{opt.label}</span>
                        </button>
                      ));
                    })()}
                  </div>
                </div>

              </div>
            ) : (
              /* =========================================================================
                 MODE 2: LIVE 1-ON-1 NGO DM CHAT
                 ========================================================================= */
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
                  {loadingChat ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2.5 text-slate-400 text-xs font-bold animate-pulse">
                      <div className="h-6 w-6 animate-spin rounded-full border-3 border-green-700 border-t-transparent" />
                      <span>Loading message history...</span>
                    </div>
                  ) : chatError ? (
                    <div className="text-center p-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs font-semibold space-y-2">
                      <AlertCircle className="mx-auto" size={20} />
                      <p>{chatError}</p>
                      <Button onClick={switchToLiveChat} className="py-1 px-3 text-xs bg-red-600 text-white rounded-lg">
                        Retry
                      </Button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-2 bg-white rounded-3xl border border-slate-150/80 shadow-xs max-w-sm mx-auto my-auto animate-fadeIn">
                      <div className="w-10 h-10 rounded-full bg-green-50 text-green-700 flex items-center justify-center font-black text-lg mx-auto">
                        🐾
                      </div>
                      <h4 className="text-xs font-black text-slate-800">Direct Chat with {selectedNgo.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        Type your message below. The NGO coordinators will respond to your rescue inquiry directly.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOutgoing = msg.senderId === currentUserId;

                      return (
                        <div
                          key={msg.id}
                          className={`flex w-full ${isOutgoing ? "justify-end" : "justify-start"} animate-fadeIn`}
                        >
                          <div
                            className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-3 shadow-xs text-xs leading-relaxed space-y-2 ${
                              isOutgoing
                                ? "bg-green-700 text-white rounded-tr-xs shadow-green-100"
                                : "bg-white border border-slate-200 text-slate-850 rounded-tl-xs"
                            }`}
                          >
                            {msg.metadata && msg.metadata.type === "report_attachment" && (
                              <div
                                className={`rounded-2xl p-3 border space-y-2 text-left mb-1.5 ${
                                  isOutgoing
                                    ? "bg-green-800/80 border-green-600 text-white shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-900 shadow-xs"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-current/20">
                                  <span className="text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                                    🚨 {msg.metadata.status ? `${msg.metadata.status.toUpperCase()} REPORT` : "RESCUE REPORT"}
                                  </span>
                                  {msg.metadata.urgency && (
                                    <span
                                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                        msg.metadata.urgency === "Urgent" || msg.metadata.urgency === "Critical"
                                          ? "bg-red-500 text-white"
                                          : isOutgoing
                                          ? "bg-green-600 text-white"
                                          : "bg-slate-200 text-slate-700"
                                      }`}
                                    >
                                      {msg.metadata.urgency}
                                    </span>
                                  )}
                                </div>

                                {msg.metadata.imageUrl && (
                                  <img
                                    src={msg.metadata.imageUrl}
                                    alt="Report Attachment"
                                    className="w-full h-32 object-cover rounded-xl border border-current/10"
                                  />
                                )}

                                <div className="space-y-0.5 text-xs">
                                  <p className="font-black text-[12px] truncate">
                                    🐾 {msg.metadata.breed || msg.metadata.animalType || "Animal in Need"}
                                  </p>
                                  {msg.metadata.location && (
                                    <p className="text-[11px] truncate opacity-90 flex items-center gap-1">
                                      <MapPin size={11} className="shrink-0" /> {msg.metadata.location}
                                    </p>
                                  )}
                                </div>

                                {msg.metadata.reportId && (
                                  <div className="pt-1.5">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/reports/${msg.metadata.reportId}`)}
                                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                                        isOutgoing
                                          ? "bg-white text-green-900 hover:bg-slate-100"
                                          : "bg-green-700 text-white hover:bg-green-800"
                                      }`}
                                    >
                                      <ExternalLink size={12} /> View Report Details
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <p className="whitespace-pre-wrap break-words font-medium">{msg.content}</p>

                            <div className="flex items-center justify-end gap-1 text-[9px] font-bold opacity-75">
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              {isOutgoing && (
                                <span>{msg.isRead ? <CheckCheck size={12} /> : <Check size={12} />}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {isTyping && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-xs px-3.5 py-2 text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs">
                        <span>{typingUserName} is typing...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messageEndRef} />
                </div>

                {/* Live Message Composer */}
                <form
                  onSubmit={handleSendLiveMessage}
                  className="p-3 border-t border-slate-150 bg-white flex items-center gap-2 shrink-0"
                >
                  <button
                    type="button"
                    onClick={handleOpenReportPicker}
                    title="Attach StrayAid Lost & Found Report"
                    className="p-2.5 hover:bg-slate-100 text-slate-500 hover:text-green-700 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Paperclip size={17} />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Write a message to NGO..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendingMessage}
                    className="p-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}

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

      {/* 6. REPORT ATTACHMENT MODAL */}
      {showReportPicker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col max-h-[80vh] animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold text-sm">
                  📎
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Attach a Report</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Select one of your registered reports to share with {selectedNgo?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportPicker(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {loadingMyReports ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-xs font-bold">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
                  <span>Loading your reports...</span>
                </div>
              ) : myReports.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2 text-slate-500">
                  <p className="text-xs font-semibold">You don't have any active Lost & Found reports yet.</p>
                  <p className="text-[11px] text-slate-400">Create a report under Lost & Found to attach it here.</p>
                </div>
              ) : (
                myReports.map((pet) => (
                  <div
                    key={pet.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-green-50/50 hover:border-green-300 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {pet.image ? (
                        <img
                          src={pet.image}
                          alt={pet.breed || pet.animal}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center text-base shrink-0">
                          🐾
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {pet.name ? `${pet.name} (${pet.breed || pet.animal})` : (pet.breed || pet.animal)}
                          </span>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                              pet.type === "lost"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {pet.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          📍 {pet.location || "Location not provided"}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAttachReport(pet)}
                      className="py-1.5 px-3 text-xs bg-green-700 hover:bg-green-800 text-white rounded-xl cursor-pointer shrink-0 ml-2"
                    >
                      Attach
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowReportPicker(false)}
                className="py-2 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
