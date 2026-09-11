import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  HeartHandshake,
  MessageSquare,
  PhoneCall,
  ShieldCheck,
  MapPin,
  Bot,
  Users,
  AlertCircle,
  Clock,
  RotateCcw,
  Send,
  Radio,
  ArrowLeft,
  Info,
  X,
} from "lucide-react";
import {
  fetchRescueCases,
  reopenRescueCase,
  fetchCaseTimeline,
  startCaseConversationOnBackend,
  type RescueCase,
  type CaseTimelineEvent,
} from "../../services/connect/caseApiService";
import { enqueueOfflineStatusUpdate, flushOfflineQueue } from "../../services/connect/offlineQueue";
import {
  getRegisteredNgos,
  type RegisteredNGO,
  type EmergencyHelpline,
} from "../../services/lost-found/messageApiService";
import { CHATBOT_FLOW_CONFIG, type ChatOption } from "../../services/connect/chatbotFlow";
import { createRescueCaseOnBackend } from "../../services/connect/caseApiService";
import { uploadImage } from "../../services/storage/uploadImage";
import { getSocket } from "../../services/socket";

interface CitizenConnectViewProps {
  currentUserId: string | null;
  userRole?: string;
}

export default function CitizenConnectView({ currentUserId }: CitizenConnectViewProps) {
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState<"help" | "my_cases" | "inbox" | "volunteer">("help");
  const [helpSubTab, setHelpSubTab] = useState<"ngos" | "helplines">("ngos");

  // NGOs & Helplines
  const [ngos, setNgos] = useState<RegisteredNGO[]>([]);
  const [helplines, setHelplines] = useState<EmergencyHelpline[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // My Rescue Cases
  const [myCases, setMyCases] = useState<RescueCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<RescueCase | null>(null);
  const [caseTimeline, setCaseTimeline] = useState<CaseTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Automated Chatbot & Drawer
  const [selectedNgo, setSelectedNgo] = useState<RegisteredNGO | null>(null);
  const [botMessages, setBotMessages] = useState<any[]>([]);
  const [currentBotStep, setCurrentBotStep] = useState<string>("MAIN_MENU");
  const [botStepHistory, setBotStepHistory] = useState<string[]>([]);
  const [selectedRescueType, setSelectedRescueType] = useState<any>(null);
  const [selectedSubType, setSelectedSubType] = useState<string | null>(null);
  const [selectedInDanger, setSelectedInDanger] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLocationText, setManualLocationText] = useState("");
  const [manualLocationSubmitting, setManualLocationSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);
  const [showNgoModal, setShowNgoModal] = useState(false);

  // Case Chat Drawer
  const [showCaseChat, setShowCaseChat] = useState(false);
  const [activeCaseConversation, setActiveCaseConversation] = useState<any>(null);
  const [caseChatMessages, setCaseChatMessages] = useState<any[]>([]);
  const [caseChatInput, setCaseChatInput] = useState("");
  const [sendingCaseMsg, setSendingCaseMsg] = useState(false);

  // Offline logging modal for volunteers
  const [showOfflineLogger, setShowOfflineLogger] = useState(false);
  const [offlineCaseId, setOfflineCaseId] = useState("");
  const [offlineStatus, setOfflineStatus] = useState<any>("ANIMAL_SECURED");
  const [offlineNotes, setOfflineNotes] = useState("");

  const messageEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadInitData() {
      try {
        setLoadingData(true);
        const { ngos: fetchedNgos, helplines: fetchedHelplines } = await getRegisteredNgos();
        setNgos(fetchedNgos);
        setHelplines(fetchedHelplines);
      } catch (err) {
        console.error("Init data error:", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadInitData();
  }, []);

  // Load user's rescue cases
  async function loadMyCases() {
    try {
      setLoadingCases(true);
      const list = await fetchRescueCases();
      setMyCases(list);
    } catch (err) {
      console.error("Failed loading cases:", err);
    } finally {
      setLoadingCases(false);
    }
  }

  useEffect(() => {
    if (activeMainTab === "my_cases") {
      loadMyCases();
    }
  }, [activeMainTab]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botMessages, showManualInput, selectedNgo]);

  // Handle Reopening Resolved Case
  async function handleReopenCase(caseId: string) {
    const reason = prompt("Why are you reopening this case? (e.g. animal sighted again, medical relapse):");
    if (!reason) return;

    try {
      const updated = await reopenRescueCase(caseId, reason);
      setMyCases((prev) => prev.map((c) => (c.caseId === caseId ? updated : c)));
      if (selectedCaseDetail?.caseId === caseId) setSelectedCaseDetail(updated);
      alert("Rescue case has been reopened and returned to active coordination.");
    } catch (err: any) {
      alert(err?.message || "Failed to reopen case");
    }
  }

  // Load Timeline
  async function loadTimelineForCase(c: RescueCase) {
    setSelectedCaseDetail(c);
    try {
      setLoadingTimeline(true);
      const events = await fetchCaseTimeline(c.caseId);
      setCaseTimeline(events);
    } catch (err) {
      console.error("Timeline error:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }

  // Open Case Chat
  async function openCaseChat(c: RescueCase) {
    try {
      const res = await startCaseConversationOnBackend(c.caseId, "CASE_GROUP", `Case #${c.caseNumber} Team`);
      setActiveCaseConversation(res.conversation);
      setCaseChatMessages(res.messages || []);
      setShowCaseChat(true);

      const socket = getSocket();
      socket.emit("join_conversation_room", { conversationId: res.conversation.id, userId: currentUserId });
    } catch (err) {
      alert("Failed to open case communication room");
    }
  }

  // Send Case Chat Message
  async function handleSendCaseMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!caseChatInput.trim() || !activeCaseConversation || !currentUserId || sendingCaseMsg) return;

    setSendingCaseMsg(true);
    try {
      const socket = getSocket();
      const newMsg = {
        id: "msg_" + Date.now(),
        conversationId: activeCaseConversation.id,
        senderId: currentUserId,
        senderName: "Citizen Reporter",
        content: caseChatInput.trim(),
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      setCaseChatMessages((prev) => [...prev, newMsg]);
      setCaseChatInput("");

      socket.emit("send_message", {
        conversationId: activeCaseConversation.id,
        content: newMsg.content,
        senderId: currentUserId,
      });
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setSendingCaseMsg(false);
    }
  }

  // Handle Logging Offline Field Status Update
  function handleQueueOfflineUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!offlineCaseId.trim()) return;

    enqueueOfflineStatusUpdate({
      caseId: offlineCaseId.trim(),
      status: offlineStatus,
      timestamp: new Date().toISOString(),
      volunteerId: currentUserId || "offline-rescuer",
      volunteerName: "Field Rescuer",
      notes: offlineNotes.trim() || undefined,
    });

    alert("Field status update queued locally! It will automatically sync as soon as you are in network coverage.");
    setShowOfflineLogger(false);
    setOfflineCaseId("");
    setOfflineNotes("");

    // Try flushing if currently online
    flushOfflineQueue().catch(() => {});
  }

  // Chatbot Setup
  function initChatbotForNgo(ngo: RegisteredNGO) {
    setSelectedNgo(ngo);
    setCurrentBotStep("MAIN_MENU");
    setBotStepHistory([]);
    setSelectedRescueType(null);
    setSelectedSubType(null);
    setSelectedInDanger(false);
    setShowManualInput(false);

    const initialStep = CHATBOT_FLOW_CONFIG["MAIN_MENU"];
    const initialText = typeof initialStep.message === "function"
      ? initialStep.message({ ngoName: ngo.name, ngoLocation: ngo.location })
      : initialStep.message;

    setBotMessages([
      {
        id: "msg_init_" + Date.now(),
        sender: "bot",
        text: initialText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        options: initialStep.options,
      },
    ]);
  }

  function handleResetToMainMenu() {
    if (!selectedNgo) return;
    setCurrentBotStep("MAIN_MENU");
    setBotStepHistory([]);
    setShowManualInput(false);
    const mainStep = CHATBOT_FLOW_CONFIG["MAIN_MENU"];
    setBotMessages((prev) => [
      ...prev,
      {
        id: "msg_reset_" + Date.now(),
        sender: "bot",
        text: mainStep.message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        options: mainStep.options,
      },
    ]);
  }

  function handleGoBack() {
    if (!selectedNgo || botStepHistory.length === 0 || currentBotStep === "MAIN_MENU") {
      handleResetToMainMenu();
      return;
    }
    const prevStep = botStepHistory[botStepHistory.length - 1] || "MAIN_MENU";
    setBotStepHistory((prev) => prev.slice(0, -1));
    setCurrentBotStep(prevStep);
    setShowManualInput(false);
    const stepConfig = CHATBOT_FLOW_CONFIG[prevStep] || CHATBOT_FLOW_CONFIG["MAIN_MENU"];
    setBotMessages((prev) => [
      ...prev,
      {
        id: "user_back_" + Date.now(),
        sender: "user",
        text: "← Back",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        id: "bot_back_" + Date.now(),
        sender: "bot",
        text: typeof stepConfig.message === "function" ? stepConfig.message({ ngoName: selectedNgo.name }) : stepConfig.message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        options: stepConfig.options,
      },
    ]);
  }

  async function handleOptionSelect(option: ChatOption) {
    if (!selectedNgo) return;
    if (option.action === "go_back") {
      handleGoBack();
      return;
    }

    setBotMessages((prev) => [
      ...prev,
      {
        id: "user_" + Date.now(),
        sender: "user",
        text: option.label,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    if (option.nextStep || option.action) {
      setBotStepHistory((prev) => [...prev, currentBotStep]);
    }
    if (option.rescueType) setSelectedRescueType(option.rescueType);
    if (option.subType) setSelectedSubType(option.subType);
    if (option.inDanger !== undefined) setSelectedInDanger(option.inDanger);

    if (option.action) {
      switch (option.action) {
        case "send_current_location":
          await handleSendCurrentLocation(option.rescueType || selectedRescueType || "injured_animal", option.inDanger || selectedInDanger);
          return;
        case "prompt_manual_location":
          setShowManualInput(true);
          return;
        case "get_directions":
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedNgo.location || selectedNgo.name)}`, "_blank");
          return;
        case "prompt_photo_upload":
          fileInputRef.current?.click();
          return;
        case "navigate_guardian":
          navigate("/guardian");
          return;
        case "show_donation_info":
          setBotMessages((prev) => [
            ...prev,
            {
              id: "bot_don_" + Date.now(),
              sender: "bot",
              text: `💳 You can support ${selectedNgo.name} directly:\n\nHelpline / UPI: ${selectedNgo.phone}\nService Area: ${selectedNgo.serviceArea}\n\nThank you for saving stray lives! ❤️`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              options: [{ id: "opt_contact_don", label: "📞 Contact NGO", action: "contact_ngo" }],
            },
          ]);
          return;
        case "main_menu":
          handleResetToMainMenu();
          return;
      }
    }

    if (option.nextStep) {
      const nextStepConfig = CHATBOT_FLOW_CONFIG[option.nextStep];
      if (nextStepConfig) {
        setCurrentBotStep(option.nextStep);
        const nextText = typeof nextStepConfig.message === "function"
          ? nextStepConfig.message({ ngoName: selectedNgo.name })
          : nextStepConfig.message;

        setBotMessages((prev) => [
          ...prev,
          {
            id: "bot_" + Date.now(),
            sender: "bot",
            text: nextText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            options: nextStepConfig.options,
          },
        ]);
      }
    }
  }

  async function handleSendCurrentLocation(rescueType: string, inDanger: boolean) {
    if (!selectedNgo) return;
    if (!navigator.geolocation) {
      setShowManualInput(true);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const newCase = await createRescueCaseOnBackend({
            animalType: "dog",
            condition: inDanger
              ? "Emergency: Animal in Critical Danger"
              : selectedSubType
              ? `Report: ${selectedSubType}`
              : `Injured Stray Animal (${rescueType})`,
            priority: inDanger ? "critical" : "urgent",
            exactLocation: `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            coordinates: { latitude, longitude },
            targetNgoId: selectedNgo.id,
          });

          setBotMessages((prev) => [
            ...prev,
            {
              id: "bot_succ_" + Date.now(),
              sender: "bot",
              text: `🚨 Rescue Case #${newCase.caseNumber} registered and dispatched to ${selectedNgo.name}!\n\nA responder has been alerted. Please keep yourself and the animal safe until help arrives.`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isSuccess: true,
              options: [
                { id: "opt_view_my_case", label: "📋 Track in My Cases", nextStep: "MAIN_MENU" },
              ],
            },
          ]);
        } catch {
          setShowManualInput(true);
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setShowManualInput(true);
      }
    );
  }

  async function handleManualLocationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualLocationText.trim() || !selectedNgo || manualLocationSubmitting) return;

    setManualLocationSubmitting(true);
    setShowManualInput(false);
    const loc = manualLocationText.trim();
    setManualLocationText("");

    try {
      const newCase = await createRescueCaseOnBackend({
        animalType: "dog",
        condition: selectedInDanger ? "Emergency: Animal in Danger" : "Injured Stray Animal",
        priority: selectedInDanger ? "critical" : "urgent",
        exactLocation: loc,
        targetNgoId: selectedNgo.id,
      });

      setBotMessages((prev) => [
        ...prev,
        {
          id: "bot_man_succ_" + Date.now(),
          sender: "bot",
          text: `🚨 Rescue Case #${newCase.caseNumber} registered and sent to ${selectedNgo.name}!\n\nLocation: ${loc}\n\nThe team is reviewing the dispatch.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isSuccess: true,
          options: [{ id: "opt_menu", label: "🏠 Main Menu", action: "main_menu" }],
        },
      ]);
    } catch (err) {
      setBotError("Could not submit case. Please check connection.");
    } finally {
      setManualLocationSubmitting(false);
    }
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length || !selectedNgo || photoUploading) return;
    const file = e.target.files[0];
    setPhotoUploading(true);

    try {
      const imageUrl = await uploadImage(file);
      await createRescueCaseOnBackend({
        animalType: "other",
        condition: "Weak / Abandoned Animal",
        priority: "urgent",
        exactLocation: "Photo Evidence Provided",
        photos: [imageUrl],
        targetNgoId: selectedNgo.id,
      });

      setBotMessages((prev) => [
        ...prev,
        {
          id: "bot_photo_succ_" + Date.now(),
          sender: "bot",
          text: "📷 Photo uploaded and rescue case registered! The NGO rescue coordinators have been notified.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isSuccess: true,
          options: [{ id: "opt_menu", label: "🏠 Main Menu", action: "main_menu" }],
        },
      ]);
    } catch (err) {
      alert("Failed to upload photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 pb-28 relative font-sans animate-fadeIn">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelected} className="hidden" />

      {/* 1. Page Header */}
      <div className="max-w-4xl mx-auto mb-6 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
          <span>🐾</span>
          <span>Community Rescue & Support Hub</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2.5">
          <HeartHandshake className="text-emerald-600 shrink-0" size={38} /> Connect
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-lg mx-auto leading-relaxed">
          Report animals in distress, track your active rescue cases, or volunteer with local verified rescue teams.
        </p>
      </div>

      {/* 2. Top Main Tab Switcher */}
      <div className="max-w-xl mx-auto mb-7 flex gap-1.5 p-1.5 bg-slate-200/70 backdrop-blur-xs rounded-2xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setActiveMainTab("help")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMainTab === "help" ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Radio size={14} className={activeMainTab === "help" ? "text-emerald-600" : ""} /> Find Help
        </button>

        <button
          onClick={() => setActiveMainTab("my_cases")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMainTab === "my_cases" ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock size={14} className={activeMainTab === "my_cases" ? "text-amber-500" : ""} /> My Cases
        </button>

        <button
          onClick={() => setActiveMainTab("volunteer")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMainTab === "volunteer" ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users size={14} className={activeMainTab === "volunteer" ? "text-purple-600" : ""} /> Volunteer
        </button>
      </div>

      {/* 3. TAB 1: FIND HELP (NGOs & Helplines) */}
      {activeMainTab === "help" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setHelpSubTab("ngos")}
              className={`py-1.5 px-4 rounded-full text-xs font-bold transition ${
                helpSubTab === "ngos" ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              🏢 Registered NGOs
            </button>
            <button
              onClick={() => setHelpSubTab("helplines")}
              className={`py-1.5 px-4 rounded-full text-xs font-bold transition ${
                helpSubTab === "helplines" ? "bg-red-600 text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              📞 24/7 Emergency Helplines
            </button>
          </div>

          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <p className="text-xs font-bold text-slate-500 mt-2">Loading verified organizations...</p>
            </div>
          ) : helpSubTab === "ngos" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {ngos.map((ngo) => (
                <Card
                  key={ngo.id}
                  className="flex flex-col justify-between p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xl border border-emerald-100 shadow-2xs">
                        🐾
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-black text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                        {ngo.name}
                      </h2>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 mt-1">
                        <ShieldCheck size={11} className="text-sky-600" /> Verified NGO
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span>{ngo.location}</span>
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">{ngo.description}</p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      <Users size={12} className="inline mr-1" /> {ngo.activeMembers} Rescuers
                    </span>
                    <Button
                      onClick={() => initChatbotForNgo(ngo)}
                      className="py-2 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Bot size={14} /> Connect
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
              {helplines.map((h) => (
                <Card key={h.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black text-lg">
                      🚑
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      24/7 Helpline
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{h.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{h.description}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-700">📞 {h.phone}</span>
                    <a href={`tel:${h.phone}`}>
                      <Button className="py-1.5 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs">
                        <PhoneCall size={12} className="mr-1 inline" /> Call Now
                      </Button>
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: MY RESCUE CASES (Live Status Tracker) */}
      {activeMainTab === "my_cases" && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">My Registered Rescue Cases</h2>
              <p className="text-xs text-slate-500">Live operational lifecycle from dispatch to recovery</p>
            </div>
            <Button onClick={loadMyCases} className="py-1.5 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl">
              <RotateCcw size={12} className="mr-1 inline" /> Refresh
            </Button>
          </div>

          {loadingCases ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <p className="text-xs font-bold text-slate-400 mt-2">Loading your rescue cases...</p>
            </div>
          ) : myCases.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl mx-auto">
                🐾
              </div>
              <h3 className="text-base font-black text-slate-800">No Rescue Cases Logged Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When you report an injured, trapped, or sick animal using the Connect chatbot, your case will appear here with live tracking.
              </p>
              <Button onClick={() => setActiveMainTab("help")} className="py-2 px-4 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs">
                Report an Animal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {myCases.map((c) => (
                <div
                  key={c.caseId}
                  className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  {/* Case Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        #{c.caseNumber}
                      </span>
                      <h3 className="text-sm font-black text-slate-900">
                        {c.breed || c.animalType.toUpperCase()}: {c.condition || "Animal Rescue"}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        c.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.status === "DECEASED"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Visual Status Stepper */}
                  <div className="py-2">
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-center text-[10px] font-bold">
                      {[
                        { label: "Reported", active: true },
                        { label: "NGO Response", active: c.status !== "NEW" },
                        { label: "Volunteer", active: ["VOLUNTEER_ASSIGNED", "RESCUE_IN_PROGRESS", "ANIMAL_SECURED", "MEDICAL_CARE", "RECOVERY", "RESOLVED"].includes(c.status) },
                        { label: "Secured", active: ["ANIMAL_SECURED", "MEDICAL_CARE", "RECOVERY", "RESOLVED"].includes(c.status) },
                        { label: "Medical Care", active: ["MEDICAL_CARE", "RECOVERY", "RESOLVED"].includes(c.status) },
                        { label: "Foster/Rest", active: ["RECOVERY", "RESOLVED"].includes(c.status) },
                        { label: "Resolved", active: c.status === "RESOLVED" },
                      ].map((step, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className={`h-1.5 rounded-full ${step.active ? "bg-emerald-500" : "bg-slate-200"}`} />
                          <span className={step.active ? "text-emerald-800 font-extrabold" : "text-slate-400"}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compassionate Message for Deceased Outcome */}
                  {c.status === "DECEASED" && (
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
                      <p className="font-bold">🖤 Rescue Team Notification:</p>
                      <p>We are very sorry. Despite rescue and veterinary medical efforts, the animal did not survive. The complete case record and medical timeline have been securely preserved.</p>
                    </div>
                  )}

                  {/* Case Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate max-w-sm">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.generalLocation || c.exactLocation}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.status === "RESOLVED" && (
                        <Button
                          onClick={() => handleReopenCase(c.caseId)}
                          className="py-1.5 px-3 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl"
                        >
                          <RotateCcw size={12} className="mr-1 inline" /> Reopen Case
                        </Button>
                      )}
                      <Button
                        onClick={() => openCaseChat(c)}
                        className="py-1.5 px-3 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs"
                      >
                        <MessageSquare size={12} className="mr-1 inline" /> Team Chat
                      </Button>
                      <Button
                        onClick={() => loadTimelineForCase(c)}
                        className="py-1.5 px-3 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                      >
                        Timeline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: VOLUNTEER NETWORK (Three Distinct Volunteer Categories) */}
      {activeMainTab === "volunteer" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-slate-900">Volunteer With StrayAid Rescue Teams</h2>
            <p className="text-xs text-slate-500">Choose your area of contribution based on your skills and availability</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Rescue Volunteer */}
            <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xl">
                  🚑
                </div>
                <h3 className="text-base font-black text-slate-900">Rescue Volunteer</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Respond to emergency rescue dispatches in your area, capture animals safely, and transport them to partner shelters or vet hospitals.
                </p>
                <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                  <p>✓ Emergency on-field response</p>
                  <p>✓ Animal transport & securing</p>
                  <p>✓ Offline field update access</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => alert("Thank you for registering as a Rescue Volunteer! Our coordinator will contact you.")}
                  className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  Join Rescue Squad
                </Button>
                <button
                  onClick={() => setShowOfflineLogger(true)}
                  className="w-full py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                >
                  📍 Log Field Status (Offline)
                </button>
              </div>
            </Card>

            {/* 2. Foster Volunteer */}
            <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xl">
                  🏠
                </div>
                <h3 className="text-base font-black text-slate-900">Foster Volunteer</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Provide temporary safe shelter and loving convalescence for recovering or vulnerable animals. Matches are made using transparent criteria.
                </p>
                <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                  <p>✓ Temporary safe home care</p>
                  <p>✓ Complete residential privacy</p>
                  <p>✓ Basic medication administration</p>
                </div>
              </div>

              <Button
                onClick={() => alert("Foster profile registered! You will only be matched based on your home capacity and species preference.")}
                className="w-full py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs"
              >
                Register as Foster Home
              </Button>
            </Card>

            {/* 3. Awareness Volunteer */}
            <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-black text-xl">
                  📢
                </div>
                <h3 className="text-base font-black text-slate-900">Awareness Volunteer</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Share adoption posters, raise community awareness on street animal vaccination, and help locate lost pets on social media.
                </p>
                <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                  <p>✓ Share digital adoption posters</p>
                  <p>✓ Anti-cruelty awareness campaigns</p>
                  <p>✓ Community outreach & events</p>
                </div>
              </div>

              <Button
                onClick={() => alert("Thank you! You are now registered as an Awareness Volunteer.")}
                className="w-full py-2.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs"
              >
                Join Awareness Network
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* 6. TIMELINE AUDIT MODAL */}
      {selectedCaseDetail && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Case #{selectedCaseDetail.caseNumber} Timeline</h3>
                <p className="text-xs text-slate-500">Immutable audit record of all case events</p>
              </div>
              <button onClick={() => setSelectedCaseDetail(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pl-3 border-l-2 border-emerald-500 ml-2">
              {loadingTimeline ? (
                <div className="text-xs text-slate-400">Loading audit history...</div>
              ) : (
                caseTimeline.map((evt) => (
                  <div key={evt.eventId} className="space-y-0.5 text-xs relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-600 absolute -left-[17px] top-1" />
                    <div className="flex items-center justify-between text-slate-800 font-bold">
                      <span>{evt.type.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {evt.reason && <p className="text-slate-500 text-[11px]">{evt.reason}</p>}
                    <span className="text-[10px] text-slate-400">By: {evt.actorName || evt.actorRole || "System"}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. OFFLINE FIELD STATUS LOGGER MODAL */}
      {showOfflineLogger && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <form onSubmit={handleQueueOfflineUpdate} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">📍 Log Field Status (Offline Queue)</h3>
                <p className="text-xs text-slate-500">Queued locally when in poor network coverage</p>
              </div>
              <button type="button" onClick={() => setShowOfflineLogger(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-bold">Case ID / Number:</label>
                <input
                  type="text"
                  placeholder="e.g. case-sa-1024"
                  value={offlineCaseId}
                  onChange={(e) => setOfflineCaseId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-bold">Field Status Event:</label>
                <select
                  value={offlineStatus}
                  onChange={(e) => setOfflineStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold"
                >
                  <option value="RESCUE_IN_PROGRESS">🚀 Arrived at Location / Rescue Started</option>
                  <option value="ANIMAL_SECURED">🐾 Animal Secured Successfully</option>
                  <option value="MEDICAL_CARE">🏥 Arrived at Vet / Under Medical Care</option>
                  <option value="RECOVERY">🏠 Transported to Foster Convalescence</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-bold">Field Notes:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dog secured safely with muzzle, transport to clinic started"
                  value={offlineNotes}
                  onChange={(e) => setOfflineNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <Button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs">
                Save Status to Offline Queue
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 8. AUTOMATED CHATBOT DRAWER (Fast Decision Tree Bot) */}
      {selectedNgo && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-[100dvh] flex flex-col shadow-2xl animate-slideLeft overflow-hidden z-[10000]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-150 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedNgo(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-600 hover:text-slate-900 cursor-pointer shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black text-base shrink-0 border border-emerald-200 shadow-2xs">
                  🐾
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">{selectedNgo.name}</h3>
                    <ShieldCheck size={14} className="text-sky-600 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium truncate block">
                    📍 {selectedNgo.location.split("&")[0]}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setShowNgoModal(true)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer">
                  <Info size={17} />
                </button>
                <button onClick={() => setSelectedNgo(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Verification Channel Banner */}
            <div className="bg-slate-50/80 border-b border-slate-100 py-1.5 px-4 text-center">
              <span className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-600" /> Verified Rescue Channel • Direct Automated Dispatch
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
              {botMessages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div key={msg.id} className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-fadeIn`}>
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center shrink-0 mr-2 mt-0.5 border border-emerald-200 shadow-2xs font-bold">
                        🐾
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs text-xs sm:text-[13px] leading-relaxed space-y-2 ${
                      isUser
                        ? "bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-tr-xs shadow-sm"
                        : msg.isSuccess
                        ? "bg-emerald-50/90 border border-emerald-200 text-emerald-950 rounded-tl-xs"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <div className={`text-[9px] font-bold text-right ${isUser ? "text-emerald-100" : "text-slate-400"}`}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                );
              })}

              {locationLoading && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="bg-white border border-emerald-200 text-emerald-950 rounded-2xl p-3 text-xs font-bold flex items-center gap-2 shadow-xs">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <span>🛰️ Acquiring GPS location & dispatching case...</span>
                  </div>
                </div>
              )}

              {showManualInput && (
                <form onSubmit={handleManualLocationSubmit} className="bg-white border border-emerald-300 rounded-2xl p-3.5 shadow-md space-y-2.5 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-slate-800">📍 Enter Animal's Exact Location:</label>
                  <input
                    type="text"
                    placeholder="e.g. Sector 62, Greater Noida near Metro Pillar 42"
                    value={manualLocationText}
                    onChange={(e) => setManualLocationText(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowManualInput(false)} className="py-1.5 px-3 text-[11px] font-bold text-slate-500 rounded-lg cursor-pointer">
                      Cancel
                    </button>
                    <Button type="submit" disabled={!manualLocationText.trim() || manualLocationSubmitting} className="py-1.5 px-4 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs">
                      {manualLocationSubmitting ? "Submitting..." : "Send Location"}
                    </Button>
                  </div>
                </form>
              )}

              {botError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2 animate-fadeIn">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <span>{botError}</span>
                </div>
              )}

              <div ref={messageEndRef} />
            </div>

            {/* Quick-Reply Options Footer */}
            <div className="p-3.5 border-t border-slate-150/80 bg-white/95 backdrop-blur-sm space-y-2.5 shrink-0 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Select an option:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {currentBotStep !== "MAIN_MENU" && (
                    <button onClick={handleGoBack} className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-slate-100 border border-slate-200">
                      <ArrowLeft size={12} /> Back
                    </button>
                  )}
                  <button onClick={handleResetToMainMenu} className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-emerald-50">
                    <RotateCcw size={12} /> Reset Menu
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-0.5">
                {(() => {
                  const latestBotMsg = [...botMessages].reverse().find((m) => m.sender === "bot");
                  const rawOptions = latestBotMsg?.options !== undefined
                    ? latestBotMsg.options
                    : CHATBOT_FLOW_CONFIG[currentBotStep]?.options || [];
                  const currentOptions = rawOptions.filter(
                    (opt: ChatOption) => opt.action !== "go_back" && !opt.label.includes("Back")
                  );

                  return currentOptions.map((opt: ChatOption) => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={locationLoading || photoUploading}
                      onClick={() => handleOptionSelect(opt)}
                      className={`py-2.5 px-3.5 rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                        opt.label.includes("Contact NGO")
                          ? "bg-sky-600 hover:bg-sky-700 text-white border border-sky-600 shadow-sm"
                          : opt.label.includes("Rescue") || opt.label.includes("Injured") || opt.label.includes("Danger") || opt.label.includes("Send") || opt.label.includes("Share")
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-sm"
                          : "bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200"
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. CASE TEAM CHAT DRAWER */}
      {showCaseChat && activeCaseConversation && (
        <div className="fixed inset-0 z-[10020] flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white h-[100dvh] flex flex-col shadow-2xl border-l border-slate-200 animate-slideLeft">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900">{activeCaseConversation.title || "Rescue Case Coordination"}</h3>
                <span className="text-[10px] text-slate-500">Citizen & NGO Rescue Channel</span>
              </div>
              <button onClick={() => setShowCaseChat(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {caseChatMessages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed space-y-1 ${
                      isMe ? "bg-emerald-600 text-white rounded-tr-xs" : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs"
                    }`}>
                      <div className="text-[10px] font-bold opacity-75">{msg.senderName || "Responder"}</div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className="text-[9px] opacity-60 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendCaseMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Message rescue team..."
                value={caseChatInput}
                onChange={(e) => setCaseChatInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!caseChatInput.trim() || sendingCaseMsg}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 10. NGO PROFILE MODAL */}
      {showNgoModal && selectedNgo && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black text-base border border-emerald-200 shadow-2xs">
                  🐾
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedNgo.name}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-sky-700 font-bold">
                    <ShieldCheck size={12} className="text-sky-600" /> Verified NGO
                  </div>
                </div>
              </div>
              <button onClick={() => setShowNgoModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>{selectedNgo.description}</p>
              <div>
                <span className="font-bold text-slate-800 block">Service Area:</span>
                <p>{selectedNgo.serviceArea}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-800">Helpline: {selectedNgo.phone}</span>
                <a href={`tel:${selectedNgo.phone}`}>
                  <Button className="py-1.5 px-3 text-xs bg-emerald-600 text-white rounded-xl">Call NGO</Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
