import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  MessageSquare,
  PhoneCall,
  ShieldCheck,
  MapPin,
  Clock,
  RotateCcw,
  Send,
  Radio,
  Info,
  X,
  AlertTriangle,
  Compass,
  CheckCircle2,
  BellRing,
} from "lucide-react";
import GuardianRescueAssignments from "../guardian/GuardianRescueAssignments";
import ImmediateRescueRequests from "../reports/ImmediateRescueRequests";
import NearbyReports from "../reports/NearbyReports";
import {
  fetchRescueCases,
  reopenRescueCase,
  fetchCaseTimeline,
  startCaseConversationOnBackend,
  type RescueCase,
  type CaseTimelineEvent,
} from "../../services/connect/caseApiService";
import {
  getRegisteredNgos,
  type RegisteredNGO,
  type EmergencyHelpline,
} from "../../services/lost-found/messageApiService";
import {
  CHATBOT_FLOW_CONFIG,
  type ChatOption,
  type ChatMessage,
} from "./chatbotFlow";
import { getSocket } from "../../services/socket";
import { getGuardian } from "../../services/guardian/getGuardian";

interface GuardianConnectViewProps {
  currentUserId: string | null;
  userRole?: string;
}

export default function GuardianConnectView({ currentUserId }: GuardianConnectViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "assignments" | "immediate" | "nearby" | "ngos" | "helplines" | "my_cases"
  >("assignments");

  // Guardian profile data
  const [guardianProfile, setGuardianProfile] = useState<any>(null);
  const [loadingGuardian, setLoadingGuardian] = useState(true);

  // NGOs & Helplines
  const [ngos, setNgos] = useState<RegisteredNGO[]>([]);
  const [helplines, setHelplines] = useState<EmergencyHelpline[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);

  // My Rescue Cases
  const [myCases, setMyCases] = useState<RescueCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<RescueCase | null>(null);
  const [caseTimeline, setCaseTimeline] = useState<CaseTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Quick-Reply Chatbot Drawer
  const [selectedNgo, setSelectedNgo] = useState<RegisteredNGO | null>(null);
  const [botMessages, setBotMessages] = useState<ChatMessage[]>([]);
  const [currentBotStep, setCurrentBotStep] = useState<string>("MAIN_MENU");
  const [showNgoModal, setShowNgoModal] = useState(false);

  // Case Chat Drawer
  const [showCaseChat, setShowCaseChat] = useState(false);
  const [activeCaseConversation, setActiveCaseConversation] = useState<any>(null);
  const [caseChatMessages, setCaseChatMessages] = useState<any[]>([]);
  const [caseChatInput, setCaseChatInput] = useState("");
  const [sendingCaseMsg, setSendingCaseMsg] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);

  // 1. Load Guardian Profile
  useEffect(() => {
    async function loadGuardianInfo() {
      if (!currentUserId) {
        setLoadingGuardian(false);
        return;
      }
      try {
        setLoadingGuardian(true);
        const data = await getGuardian(currentUserId);
        setGuardianProfile(data);
      } catch (err) {
        // User may not have registered as guardian yet
        setGuardianProfile(null);
      } finally {
        setLoadingGuardian(false);
      }
    }
    loadGuardianInfo();
  }, [currentUserId]);

  // 2. Load NGOs & Helplines
  useEffect(() => {
    async function loadDirectory() {
      try {
        setLoadingDirectory(true);
        const { ngos: fetchedNgos, helplines: fetchedHelplines } = await getRegisteredNgos();
        setNgos(fetchedNgos);
        setHelplines(fetchedHelplines);
      } catch (err) {
        console.error("Failed to load rescue directory:", err);
      } finally {
        setLoadingDirectory(false);
      }
    }
    loadDirectory();
  }, []);

  // 3. Load My Cases when tab is selected
  useEffect(() => {
    if (activeTab === "my_cases") {
      loadCases();
    }
  }, [activeTab]);

  async function loadCases() {
    try {
      setLoadingCases(true);
      const data = await fetchRescueCases();
      setMyCases(data);
    } catch (err) {
      console.error("Error loading rescue cases:", err);
    } finally {
      setLoadingCases(false);
    }
  }

  // Real-time Socket.IO Listeners
  useEffect(() => {
    const socket = getSocket();

    function handleNewMessage(msg: any) {
      if (activeCaseConversation && msg.conversationId === activeCaseConversation.id) {
        setCaseChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [activeCaseConversation]);

  // Scroll chatbot to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botMessages]);

  // Open Case Timeline
  async function handleViewTimeline(c: RescueCase) {
    setSelectedCaseDetail(c);
    try {
      setLoadingTimeline(true);
      const timeline = await fetchCaseTimeline(c.caseId);
      setCaseTimeline(timeline);
    } catch (err) {
      console.error("Failed to load timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }

  // Reopen Case
  async function handleReopenCase(caseId: string) {
    const reason = prompt("Please provide reason for reopening this case:", "Animal needs further assistance");
    if (!reason) return;
    try {
      await reopenRescueCase(caseId, reason);
      alert("Rescue case reopened successfully!");
      loadCases();
      if (selectedCaseDetail?.caseId === caseId) {
        handleViewTimeline(selectedCaseDetail);
      }
    } catch (err: any) {
      alert(err.message || "Failed to reopen case");
    }
  }

  // Open Case Chat
  async function openCaseChat(c: RescueCase) {
    try {
      const res = await startCaseConversationOnBackend(c.caseId, "CASE_GROUP", `Case #${c.caseNumber} Team Channel`);
      setActiveCaseConversation(res.conversation);
      setCaseChatMessages(res.messages || []);
      setShowCaseChat(true);

      const socket = getSocket();
      socket.emit("join_conversation_room", { conversationId: res.conversation.id, userId: currentUserId });
    } catch (err) {
      alert("Failed to open case conversation");
    }
  }

  // Send Case Chat Message
  async function handleSendCaseMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!caseChatInput.trim() || !activeCaseConversation || !currentUserId || sendingCaseMsg) return;

    try {
      setSendingCaseMsg(true);
      const socket = getSocket();
      const newMsg = {
        id: "msg-" + Date.now(),
        conversationId: activeCaseConversation.id,
        senderId: currentUserId,
        senderName: "Guardian Rescuer",
        senderRole: "volunteer",
        content: caseChatInput.trim(),
        createdAt: new Date().toISOString(),
      };

      socket.emit("send_message", newMsg);
      setCaseChatMessages((prev) => [...prev, newMsg]);
      setCaseChatInput("");
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setSendingCaseMsg(false);
    }
  }

  // Chatbot Initialization for NGO
  function initChatbotForNgo(ngo?: RegisteredNGO | null) {
    const targetNgo = ngo || ngos[0] || {
      id: "ngo-default",
      name: "StrayAid Rescue NGO",
      isVerified: true,
      availability: "available" as const,
      location: "Greater Noida",
      categories: ["Rescue", "Shelter"],
      description: "Dedicated animal rescue team.",
      phone: "+91 98765 43210",
      activeMembers: 15,
      serviceArea: "Greater Noida & NCR",
    };
    setSelectedNgo(targetNgo);
    setCurrentBotStep("MAIN_MENU");

    const initialStep = CHATBOT_FLOW_CONFIG["MAIN_MENU"];
    const initialText =
      typeof initialStep.message === "function"
        ? initialStep.message({ ngoName: targetNgo.name, ngoLocation: targetNgo.location })
        : initialStep.message;

    const initialMsg: ChatMessage = {
      id: "bot-" + Date.now(),
      sender: "bot",
      isOutgoing: false,
      text: initialText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      options: initialStep.options,
    };
    setBotMessages([initialMsg]);
  }

  function handleResetToMainMenu() {
    setCurrentBotStep("MAIN_MENU");
    const mainStep = CHATBOT_FLOW_CONFIG["MAIN_MENU"];
    const text =
      typeof mainStep.message === "function"
        ? mainStep.message({ ngoName: selectedNgo?.name, ngoLocation: selectedNgo?.location })
        : mainStep.message;

    const resetMsg: ChatMessage = {
      id: "bot-" + Date.now(),
      sender: "bot",
      isOutgoing: false,
      text: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      options: mainStep.options,
    };
    setBotMessages((prev) => [...prev, resetMsg]);
  }

  function handleOptionSelect(option: ChatOption) {
    const userMessage: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      isOutgoing: true,
      text: option.label,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    if (option.action === "navigate_guardian") {
      navigate("/guardian");
      return;
    }

    if (option.action === "main_menu" || option.nextStep === "MAIN_MENU" || option.label.includes("Main Menu")) {
      setCurrentBotStep("MAIN_MENU");
      const mainStep = CHATBOT_FLOW_CONFIG["MAIN_MENU"];
      const botMessage: ChatMessage = {
        id: "bot-" + (Date.now() + 1),
        sender: "bot",
        isOutgoing: false,
        text:
          typeof mainStep.message === "function"
            ? mainStep.message({ ngoName: selectedNgo?.name, ngoLocation: selectedNgo?.location })
            : mainStep.message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        options: mainStep.options,
      };
      setBotMessages((prev) => [...prev, userMessage, botMessage]);
      return;
    }

    const nextStep = option.nextStep || "MAIN_MENU";
    setCurrentBotStep(nextStep);
    const stepConfig = CHATBOT_FLOW_CONFIG[nextStep] || CHATBOT_FLOW_CONFIG["MAIN_MENU"];

    const replyText =
      typeof stepConfig.message === "function"
        ? stepConfig.message({ ngoName: selectedNgo?.name, ngoLocation: selectedNgo?.location })
        : stepConfig.message;

    const botMessage: ChatMessage = {
      id: "bot-" + Date.now(),
      sender: "bot",
      isOutgoing: false,
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      options: stepConfig.options,
    };

    setBotMessages((prev) => [...prev, userMessage, botMessage]);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 pb-28 relative font-sans animate-fadeIn">
      {/* 1. Header Section */}
      <div className="max-w-5xl mx-auto mb-6 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
          <span>🐾</span>
          <span>Community Rescue & Field Dispatch</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2.5">
          <span className="text-3xl sm:text-4xl">🤝</span> Guardian Connect
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-emerald-700 tracking-wide uppercase">
          Your Rescue Network
        </p>
        <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-xl mx-auto leading-relaxed">
          Respond to immediate rescue requests, track nearby alerts, accept rescue assignments, and coordinate with verified rescue organizations.
        </p>
      </div>

      {/* 2. Guardian Status / Registration Alert Banner */}
      <div className="max-w-5xl mx-auto mb-6">
        {!loadingGuardian && (
          guardianProfile ? (
            <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                  🛟
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">Guardian Profile Active</span>
                    {guardianProfile.is_verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Total Rescues: <span className="font-bold text-slate-800">{guardianProfile.total_rescues || 0}</span> •
                    Status: <span className="font-bold text-emerald-600">{guardianProfile.available ? "Ready for assignments" : "Off-duty"}</span>
                  </p>
                </div>
              </div>
              <Link
                to="/guardian"
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition border border-emerald-200"
              >
                Manage Profile & Availability
              </Link>
            </div>
          ) : (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg shrink-0">
                  🤝
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-900">Guardian Volunteer Status</h4>
                  <p className="text-xs text-amber-700">
                    Complete your Guardian registration to receive geofenced rescue dispatches and assignments.
                  </p>
                </div>
              </div>
              <Link
                to="/guardian"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
              >
                Register as Guardian →
              </Link>
            </div>
          )
        )}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="max-w-5xl mx-auto mb-7 flex flex-wrap gap-1.5 p-1.5 bg-slate-200/70 backdrop-blur-xs rounded-2xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setActiveTab("assignments")}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "assignments"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BellRing size={14} className={activeTab === "assignments" ? "text-emerald-600" : ""} />
          <span>Rescue Assignments</span>
        </button>

        <button
          onClick={() => setActiveTab("immediate")}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "immediate"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <AlertTriangle size={14} className={activeTab === "immediate" ? "text-red-500 animate-pulse" : ""} />
          <span>Immediate Requests</span>
        </button>

        <button
          onClick={() => setActiveTab("nearby")}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "nearby"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Compass size={14} className={activeTab === "nearby" ? "text-blue-500" : ""} />
          <span>Nearby Reports</span>
        </button>

        <button
          onClick={() => setActiveTab("ngos")}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "ngos"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Radio size={14} className={activeTab === "ngos" ? "text-purple-600" : ""} />
          <span>Registered NGOs</span>
        </button>

        <button
          onClick={() => setActiveTab("helplines")}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "helplines"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <PhoneCall size={14} className={activeTab === "helplines" ? "text-rose-500" : ""} />
          <span>Helplines</span>
        </button>

        <button
          onClick={() => setActiveTab("my_cases")}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "my_cases"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock size={14} className={activeTab === "my_cases" ? "text-amber-500" : ""} />
          <span>My Cases</span>
        </button>
      </div>

      {/* 4. Tab Content Area */}
      <div className="max-w-5xl mx-auto">
        {/* Tab 1: Rescue Assignments */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <GuardianRescueAssignments />
          </div>
        )}

        {/* Tab 2: Immediate Rescue Requests */}
        {activeTab === "immediate" && (
          <div className="space-y-4">
            <ImmediateRescueRequests />
          </div>
        )}

        {/* Tab 3: Nearby Reports */}
        {activeTab === "nearby" && (
          <div className="space-y-4">
            <NearbyReports />
          </div>
        )}

        {/* Tab 4: Registered NGOs & Chat */}
        {activeTab === "ngos" && (
          <div className="space-y-6">
            <div className="text-center space-y-1 mb-4">
              <h2 className="text-xl font-black text-slate-900">Registered NGOs & Rescue Organizations</h2>
              <p className="text-xs text-slate-500">Connect directly with verified animal welfare organizations in your area</p>
            </div>

            {loadingDirectory ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                <p className="text-xs font-bold text-slate-500 mt-2">Loading verified organizations...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                        <h3 className="text-base font-black text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                          {ngo.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 mt-1">
                          <ShieldCheck size={11} className="text-sky-600" /> Verified Rescue Squad
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {ngo.description}
                      </p>

                      <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{ngo.serviceArea || ngo.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <PhoneCall size={12} className="text-slate-400 shrink-0" />
                          <span>{ngo.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-2 flex gap-2">
                      <Button
                        onClick={() => initChatbotForNgo(ngo)}
                        className="flex-1 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare size={13} /> Chat with NGO
                      </Button>
                      <a
                        href={`tel:${ngo.phone}`}
                        className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition flex items-center justify-center"
                        title="Call NGO Hotline"
                      >
                        <PhoneCall size={15} />
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Emergency Helplines */}
        {activeTab === "helplines" && (
          <div className="space-y-6">
            <div className="text-center space-y-1 mb-4">
              <h2 className="text-xl font-black text-slate-900">24/7 Animal Emergency Helplines</h2>
              <p className="text-xs text-slate-500">Official government, regional control rooms, and medical ambulance contacts</p>
            </div>

            {loadingDirectory ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                <p className="text-xs font-bold text-slate-500 mt-2">Loading emergency contacts...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {helplines.map((h) => (
                  <Card
                    key={h.id}
                    className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg">
                          🚨
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {h.isAvailable247 ? "24/7 Available" : "Helpline"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-slate-900">{h.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{h.description}</p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-xs font-mono font-bold text-slate-800 text-center">
                        {h.phone}
                      </div>
                    </div>

                    <a
                      href={`tel:${h.phone}`}
                      className="mt-4 w-full py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <PhoneCall size={13} /> Call Emergency Helpline
                    </a>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: My Rescue Cases */}
        {activeTab === "my_cases" && (
          <div className="space-y-6">
            <div className="text-center space-y-1 mb-4">
              <h2 className="text-xl font-black text-slate-900">Your Active & Logged Cases</h2>
              <p className="text-xs text-slate-500">Track real-time rescue status, verify dispatch updates, and coordinate with the response team</p>
            </div>

            {loadingCases ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                <p className="text-xs font-bold text-slate-500 mt-2">Loading cases...</p>
              </div>
            ) : myCases.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
                <span className="text-4xl">📂</span>
                <h3 className="text-base font-black text-slate-900">No Cases Found</h3>
                <p className="text-xs text-slate-500">You haven't reported or been assigned any rescue cases yet.</p>
                <Button onClick={() => navigate("/report")} className="py-2 px-4 text-xs bg-emerald-600 text-white rounded-xl">
                  Report Animal in Need
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {myCases.map((c) => (
                  <Card
                    key={c.caseId}
                    className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">Case #{c.caseNumber || c.caseId.slice(0, 8)}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            c.status === "RESOLVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : c.status === "NEW" || c.status === "PENDING_NGO_RESPONSE"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          }`}>
                            {c.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{c.animalType} • Priority: {c.priority}</p>
                      </div>

                      {c.priority && (
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          c.priority === "critical" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                        }`}>
                          {c.priority} Priority
                        </span>
                      )}
                    </div>

                    {c.exactLocation && (
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{c.generalLocation || c.exactLocation}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Button
                        onClick={() => handleViewTimeline(c)}
                        className="flex-1 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl"
                      >
                        <Clock size={12} className="mr-1 inline" /> Timeline
                      </Button>
                      <Button
                        onClick={() => openCaseChat(c)}
                        className="flex-1 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      >
                        <MessageSquare size={12} className="mr-1 inline" /> Team Chat
                      </Button>
                      {c.status === "RESOLVED" && (
                        <button
                          onClick={() => handleReopenCase(c.caseId)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl"
                          title="Reopen Case"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. NGO QUICK-REPLY CHATBOT DRAWER */}
      {selectedNgo && (
        <div className="fixed inset-0 z-[10000] flex justify-end bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white h-[100dvh] flex flex-col shadow-2xl border-l border-slate-200 animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-base border border-emerald-200">
                  🐾
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedNgo.name}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available Channel
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleResetToMainMenu}
                  title="Reset to Main Menu"
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={() => setShowNgoModal(true)}
                  title="NGO Info"
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                >
                  <Info size={15} />
                </button>
                <button
                  onClick={() => setSelectedNgo(null)}
                  title="Close Chat"
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Verification Channel Banner */}
            <div className="bg-emerald-50 border-b border-emerald-100 py-1 px-4 text-center">
              <span className="text-[10px] font-bold text-emerald-900 flex items-center justify-center gap-1">
                <ShieldCheck size={11} className="text-emerald-600" /> Verified Rescue Channel
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {botMessages.map((msg) => {
                const isUser = !!msg.isOutgoing;
                return (
                  <div key={msg.id} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-tr-xs"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <div className={`text-[9px] mt-1 text-right ${isUser ? "text-emerald-100" : "text-slate-400"}`}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            {/* Quick-Reply Options */}
            <div className="p-3.5 border-t border-slate-200 bg-white space-y-2 shrink-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select an option:
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {(() => {
                  const latestBotMsg = [...botMessages].reverse().find((m) => !m.isOutgoing);
                  const rawOptions: ChatOption[] = latestBotMsg?.options || CHATBOT_FLOW_CONFIG[currentBotStep]?.options || CHATBOT_FLOW_CONFIG["MAIN_MENU"].options;
                  return rawOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleOptionSelect(opt)}
                      className="py-2 px-3 rounded-xl text-xs font-bold transition bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. CASE TEAM CHAT DRAWER */}
      {showCaseChat && activeCaseConversation && (
        <div className="fixed inset-0 z-[10020] flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white h-[100dvh] flex flex-col shadow-2xl border-l border-slate-200 animate-slideLeft">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900">{activeCaseConversation.title || "Rescue Case Coordination"}</h3>
                <span className="text-[10px] text-slate-500">Guardian & NGO Rescue Channel</span>
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

      {/* 7. NGO PROFILE MODAL */}
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
                <p>{selectedNgo.serviceArea || selectedNgo.location}</p>
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

      {/* 8. CASE TIMELINE MODAL */}
      {selectedCaseDetail && (
        <div className="fixed inset-0 z-[10015] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Case #{selectedCaseDetail.caseNumber || selectedCaseDetail.caseId.slice(0, 8)} Timeline
                </h3>
                <span className="text-[10px] text-slate-500">Audit trail & rescue events</span>
              </div>
              <button onClick={() => setSelectedCaseDetail(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {loadingTimeline ? (
                <div className="py-10 text-center text-xs text-slate-400">Loading timeline...</div>
              ) : caseTimeline.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">No events logged yet for this case.</div>
              ) : (
                caseTimeline.map((ev, i) => (
                  <div key={ev.eventId || i} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" />
                      {i < caseTimeline.length - 1 && <span className="w-0.5 flex-1 bg-slate-200 my-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="font-bold text-slate-800">{ev.type.replace(/_/g, " ")}</div>
                      <div className="text-[11px] text-slate-500">{ev.reason || "Status transition"}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(ev.createdAt).toLocaleString()} • {ev.actorRole || "System"}
                      </div>
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
