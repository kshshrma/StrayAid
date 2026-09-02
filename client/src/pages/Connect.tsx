import React, { useState, useEffect, useRef } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  MessageSquare,
  Users,
  PhoneCall,
  ShieldAlert,
  X,
  Send,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Compass,
  Building,
  HeartHandshake,
  Stethoscope,
  Home,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Phone,
  Shield,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { getSocket } from "../services/socket";
import {
  Organization,
  Helpline,
  NGOConversation,
  NGOMessage,
  fetchOrganizations,
  fetchHelplines,
  startNGOConversationOnBackend,
  fetchMyNGOConversations,
  fetchNGOConversationDetails,
  sendNGOMessageToBackend,
  updateRescueStatusOnBackend,
  registerOrganizationOnBackend,
} from "../services/connect/connectService";

export default function Connect() {
  const [activeTab, setActiveTab] = useState<"groups" | "helplines">("groups");
  
  // Auth state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("You");

  // Geolocation
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Tab 1: Organizations states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgSearch, setOrgSearch] = useState("");
  const [orgTypeFilter, setOrgTypeFilter] = useState("all");
  const [orgEmergencyOnly, setOrgEmergencyOnly] = useState(false);
  const [orgAvailableOnly, setOrgAvailableOnly] = useState(false);
  const [selectedOrgForProfile, setSelectedOrgForProfile] = useState<Organization | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Tab 2: Helplines states
  const [helplines, setHelplines] = useState<Helpline[]>([]);
  const [loadingHelplines, setLoadingHelplines] = useState(true);
  const [helplineSearch, setHelplineSearch] = useState("");
  const [helplineCategory, setHelplineCategory] = useState("all");
  const [helplineState, setHelplineState] = useState("all");
  const [state1962Info, setState1962Info] = useState<{ state: string; isConfirmed: boolean; message: string }>({
    state: "All India",
    isConfirmed: true,
    message: "",
  });

  // Emergency Triage Modal
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<string | null>(null);

  // My NGO Conversations & Requests
  const [myConversations, setMyConversations] = useState<NGOConversation[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"all_orgs" | "my_requests">("all_orgs");
  const [loadingMyConvs, setLoadingMyConvs] = useState(false);

  // Real-time Chat Drawer states
  const [activeConversation, setActiveConversation] = useState<NGOConversation | null>(null);
  const [chatMessages, setChatMessages] = useState<NGOMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isOrgStaff, setIsOrgStaff] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Registration Form state
  const [regForm, setRegForm] = useState({
    name: "",
    organizationType: "rescue_ngo",
    description: "",
    city: "New Delhi",
    state: "Delhi",
    serviceAreas: "",
    phone: "",
    alternatePhone: "",
    email: "",
    website: "",
    address: "",
    operatingHours: "9:00 AM - 6:00 PM",
    emergencyAvailable: true,
    emergencyResponseEnabled: true,
    supportingDocuments: "",
  });
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // 1. Initial auth & geo check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.full_name) setCurrentUserName(data.full_name);
          });
      }
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        () => {}
      );
    }
  }, []);

  // 2. Load Organizations
  useEffect(() => {
    loadOrganizations();
  }, [orgTypeFilter, orgSearch, orgEmergencyOnly, orgAvailableOnly, userCoords]);

  async function loadOrganizations() {
    try {
      setLoadingOrgs(true);
      const data = await fetchOrganizations({
        type: orgTypeFilter,
        search: orgSearch,
        emergencyOnly: orgEmergencyOnly,
        availableOnly: orgAvailableOnly,
        lat: userCoords?.lat,
        lon: userCoords?.lon,
      });
      setOrganizations(data);
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoadingOrgs(false);
    }
  }

  // 3. Load Helplines
  useEffect(() => {
    loadHelplines();
  }, [helplineCategory, helplineState, helplineSearch]);

  async function loadHelplines() {
    try {
      setLoadingHelplines(true);
      const data = await fetchHelplines({
        category: helplineCategory,
        state: helplineState,
        search: helplineSearch,
      });
      setHelplines(data.helplines);
      setState1962Info(data.state1962Status);
    } catch (err) {
      console.error("Failed to load helplines:", err);
    } finally {
      setLoadingHelplines(false);
    }
  }

  // 4. Load My NGO Conversations
  useEffect(() => {
    if (currentUserId) {
      loadMyConversations();
    }
  }, [currentUserId]);

  async function loadMyConversations() {
    try {
      setLoadingMyConvs(true);
      const convs = await fetchMyNGOConversations();
      setMyConversations(convs);
    } catch (err) {
      console.error("Failed loading my conversations:", err);
    } finally {
      setLoadingMyConvs(false);
    }
  }

  // 5. Open NGO Chat Drawer
  async function handleOpenOrgChat(org: Organization) {
    if (!currentUserId) {
      alert("Please log in to chat with organizations.");
      return;
    }

    try {
      setLoadingChat(true);
      const result = await startNGOConversationOnBackend({
        organizationId: org.id,
        requestType: "general",
      });

      setActiveConversation(result.conversation);
      await loadConversationMessages(result.conversation.id);
    } catch (err: any) {
      console.error("Failed starting NGO conversation:", err);
      alert(err.message || "Failed to open chat");
    } finally {
      setLoadingChat(false);
    }
  }

  // 6. Open Existing Conversation
  async function handleSelectConversation(conv: NGOConversation) {
    setActiveConversation(conv);
    await loadConversationMessages(conv.id);
  }

  async function loadConversationMessages(convId: string) {
    try {
      setLoadingChat(true);
      const details = await fetchNGOConversationDetails(convId);
      setChatMessages(details.messages);
      setIsOrgStaff(details.isOrgMember);
    } catch (err) {
      console.error("Failed to load conversation details:", err);
    } finally {
      setLoadingChat(false);
    }
  }

  // 7. Socket.IO Room Joining & Listeners for Active Chat
  useEffect(() => {
    if (!activeConversation) return;

    const socket = getSocket();
    socket.emit("join_ngo_conversation", activeConversation.id);

    const onMessageReceived = (newMsg: NGOMessage) => {
      if (newMsg.conversationId === activeConversation.id) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    const onStatusUpdated = (data: { conversationId: string; status: any; updatedBy: string }) => {
      if (data.conversationId === activeConversation.id) {
        setActiveConversation((prev) => (prev ? { ...prev, rescueStatus: data.status } : null));
        loadMyConversations();
      }
    };

    const onTypingStart = (data: { conversationId: string; senderName: string }) => {
      if (data.conversationId === activeConversation.id) {
        setTypingName(data.senderName);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingName(null), 3000);
      }
    };

    const onTypingStop = (data: { conversationId: string }) => {
      if (data.conversationId === activeConversation.id) {
        setTypingName(null);
      }
    };

    socket.on("ngo_message_received", onMessageReceived);
    socket.on("ngo_request_status_updated", onStatusUpdated);
    socket.on("ngo_typing_start", onTypingStart);
    socket.on("ngo_typing_stop", onTypingStop);

    return () => {
      socket.emit("leave_ngo_conversation", activeConversation.id);
      socket.off("ngo_message_received", onMessageReceived);
      socket.off("ngo_request_status_updated", onStatusUpdated);
      socket.off("ngo_typing_start", onTypingStart);
      socket.off("ngo_typing_stop", onTypingStop);
    };
  }, [activeConversation]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, typingName, activeConversation]);

  // 8. Send Chat Message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation || sendingMessage) return;

    const content = messageText.trim();
    setMessageText("");
    setSendingMessage(true);

    const socket = getSocket();
    socket.emit("ngo_typing_stop", { conversationId: activeConversation.id });

    try {
      const newMsg = await sendNGOMessageToBackend(activeConversation.id, {
        content,
        messageType: "text",
      });

      setChatMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      loadMyConversations();
    } catch (err: any) {
      console.error("Failed to send message:", err);
      alert(err.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  }

  // Handle Typing indicator
  function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
    setMessageText(e.target.value);
    if (!activeConversation) return;

    const socket = getSocket();
    if (e.target.value.trim().length > 0) {
      socket.emit("ngo_typing_start", {
        conversationId: activeConversation.id,
        senderName: currentUserName,
      });
    } else {
      socket.emit("ngo_typing_stop", { conversationId: activeConversation.id });
    }
  }

  // 9. Quick Quick Reply Action
  function handleQuickReply(text: string) {
    setMessageText(text);
  }

  // 10. Update Rescue Status (for NGO staff)
  async function handleStatusChange(newStatus: any) {
    if (!activeConversation) return;
    try {
      const result = await updateRescueStatusOnBackend(activeConversation.id, newStatus);
      setActiveConversation(result.conversation);
      setChatMessages((prev) => [...prev, result.message]);
      loadMyConversations();
    } catch (err: any) {
      console.error("Failed to update status:", err);
      alert(err.message || "Failed to update status");
    }
  }

  // 11. Handle Registration Form Submit
  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingReg(true);
    setRegSuccessMessage(null);

    try {
      const serviceAreasArray = regForm.serviceAreas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await registerOrganizationOnBackend({
        name: regForm.name,
        organizationType: regForm.organizationType as any,
        description: regForm.description,
        city: regForm.city,
        state: regForm.state,
        serviceAreas: serviceAreasArray.length > 0 ? serviceAreasArray : [regForm.city],
        phone: regForm.phone,
        alternatePhone: regForm.alternatePhone || undefined,
        email: regForm.email,
        website: regForm.website || undefined,
        address: regForm.address,
        operatingHours: regForm.operatingHours,
        emergencyAvailable: regForm.emergencyAvailable,
        emergencyResponseEnabled: regForm.emergencyResponseEnabled,
        supportingDocuments: regForm.supportingDocuments || undefined,
      });

      setRegSuccessMessage("Organization submitted for verification. An admin will review your application.");
      loadOrganizations();
      setTimeout(() => {
        setShowRegisterModal(false);
        setRegSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error("Failed to register organization:", err);
      alert(err.message || "Registration failed");
    } finally {
      setSubmittingReg(false);
    }
  }

  // Helper: Organization type label and badge
  function getOrgTypeBadge(type: string) {
    switch (type) {
      case "rescue_ngo":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">🐾 Rescue NGO</span>;
      case "veterinary":
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">🏥 Veterinary</span>;
      case "shelter":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">🏠 Animal Shelter</span>;
      case "rescue_team":
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">🦮 Rescue Team</span>;
      case "wildlife":
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">🕊️ Wildlife Rescue</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">🤝 Welfare Org</span>;
    }
  }

  // Helper: Helpline category label
  function getHelplineCategoryBadge(cat: string) {
    switch (cat) {
      case "emergency":
        return <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-md">🚨 Emergency</span>;
      case "veterinary":
        return <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">🏥 Veterinary</span>;
      case "rescue":
        return <span className="bg-green-50 text-green-600 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-md">🐾 Animal Rescue</span>;
      case "wildlife":
        return <span className="bg-teal-50 text-teal-600 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-md">🦌 Wildlife</span>;
      case "cruelty":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">⚖️ Animal Cruelty</span>;
      case "government":
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md">🏛️ Government</span>;
      case "ambulance":
        return <span className="bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-md">🚑 Ambulance</span>;
      default:
        return <span className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">📞 Helpline</span>;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 pb-28 relative font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HERO SECTION */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
            🤝 Connect
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-semibold max-w-xl mx-auto leading-relaxed">
            Connect with rescuers, NGOs, vets, and animal welfare organizations that can help when an animal needs you.
          </p>
        </div>

        {/* PROMINENT EMERGENCY HELP BANNER */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-3xl p-5 text-white shadow-xl shadow-red-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 animate-pulse">
              🚨
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Need Immediate Emergency Help?</h3>
              <p className="text-xs text-red-100 font-medium">
                Find verified emergency hotlines, mobile ambulances, or request urgent NGO rescue.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="w-full sm:w-auto bg-white hover:bg-red-50 text-red-600 font-black px-5 py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-md cursor-pointer shrink-0"
          >
            Find Help Now
          </button>
        </div>

        {/* TOP TAB SWITCHER */}
        <div className="bg-slate-200/70 p-1.5 rounded-2xl flex gap-1 max-w-md mx-auto shadow-inner">
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "groups"
                ? "bg-white text-slate-900 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare size={15} className={activeTab === "groups" ? "text-green-600" : "text-slate-400"} />
            Chat Groups & NGOs
          </button>
          <button
            onClick={() => setActiveTab("helplines")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "helplines"
                ? "bg-white text-slate-900 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PhoneCall size={15} className={activeTab === "helplines" ? "text-green-600" : "text-slate-400"} />
            Emergency Helplines
          </button>
        </div>

        {/* TAB 1: CHAT GROUPS & REGISTERED NGOS */}
        {activeTab === "groups" && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* SUB-TAB TOGGLE: All Orgs vs My Requests */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSubTab("all_orgs")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeSubTab === "all_orgs"
                      ? "bg-green-700 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  🐾 Registered Organizations ({organizations.length})
                </button>
                <button
                  onClick={() => setActiveSubTab("my_requests")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === "my_requests"
                      ? "bg-green-700 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  📥 My Requests & Chats
                  {myConversations.length > 0 && (
                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                      {myConversations.length}
                    </span>
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowRegisterModal(true)}
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 transition cursor-pointer"
              >
                <PlusCircle size={14} /> Register NGO
              </button>
            </div>

            {/* VIEW 1: REGISTERED ORGANIZATIONS DIRECTORY */}
            {activeSubTab === "all_orgs" && (
              <div className="space-y-4">
                
                {/* Search & Category Filter Bar */}
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search NGOs, vets, shelters, area (e.g. Greater Noida, Delhi)..."
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {orgSearch && (
                      <button onClick={() => setOrgSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Category Chips */}
                  <div className="flex gap-2 overflow-x-auto pb-1 text-xs select-none">
                    {[
                      { id: "all", label: "All Types" },
                      { id: "rescue_ngo", label: "🐾 Rescue NGO" },
                      { id: "veterinary", label: "🏥 Veterinary" },
                      { id: "shelter", label: "🏠 Shelter" },
                      { id: "rescue_team", label: "🦮 Rescue Team" },
                      { id: "wildlife", label: "🕊️ Wildlife" },
                      { id: "animal_welfare", label: "🤝 Welfare Org" },
                    ].map((chip) => (
                      <button
                        key={chip.id}
                        onClick={() => setOrgTypeFilter(chip.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                          orgTypeFilter === chip.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Secondary Quick Toggles */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => setOrgAvailableOnly(!orgAvailableOnly)}
                      className={`px-3 py-1 rounded-lg font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        orgAvailableOnly
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available Now
                    </button>

                    <button
                      onClick={() => setOrgEmergencyOnly(!orgEmergencyOnly)}
                      className={`px-3 py-1 rounded-lg font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        orgEmergencyOnly
                          ? "bg-red-50 border-red-300 text-red-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span>🚨 Emergency Ready</span>
                    </button>
                  </div>
                </div>

                {/* Organization Cards List */}
                {loadingOrgs ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 space-y-3">
                    <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">Loading registered organizations...</p>
                  </div>
                ) : organizations.length === 0 ? (
                  <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200/70 space-y-3">
                    <span className="text-3xl block">🐾</span>
                    <h3 className="text-sm font-bold text-slate-800">No registered rescue organizations found nearby</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Try expanding your search filter, or check the emergency helplines directory for government and national contacts.
                    </p>
                    <button
                      onClick={() => {
                        setOrgSearch("");
                        setOrgTypeFilter("all");
                        setOrgAvailableOnly(false);
                        setOrgEmergencyOnly(false);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {organizations.map((org) => (
                      <Card
                        key={org.id}
                        className="p-5 rounded-3xl border border-slate-100 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          {/* Header: Logo, Name, Badges */}
                          <div className="flex items-start gap-3.5">
                            {org.logo ? (
                              <img
                                src={org.logo}
                                alt={org.name}
                                className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 font-black text-base flex items-center justify-center shrink-0 border border-green-100">
                                {org.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-black text-slate-900 truncate">{org.name}</h3>
                                {org.verified && (
                                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" title="Verified Organization" />
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {getOrgTypeBadge(org.organizationType)}
                                {org.verified && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    ✓ Verified
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                            {org.description}
                          </p>

                          {/* Location, Availability & Stats */}
                          <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 font-semibold">
                                <MapPin size={13} className="text-slate-400" />
                                {org.city}, {org.state}
                                {org.distanceKm !== undefined && (
                                  <span className="text-emerald-700 font-bold">({org.distanceKm} km away)</span>
                                )}
                              </span>

                              <span className="flex items-center gap-1 text-[11px] font-bold">
                                {org.availabilityStatus === "available" ? (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-emerald-700">Available</span>
                                  </>
                                ) : org.availabilityStatus === "limited" ? (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-amber-700">Limited</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                                    <span className="text-slate-400">Offline</span>
                                  </>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                              <span>Service Area: {org.serviceAreas.slice(0, 2).join(", ")}</span>
                              <span>👥 {org.members.length} Active Staff</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex gap-2">
                          <Button
                            onClick={() => handleOpenOrgChat(org)}
                            className="flex-1 bg-green-700 hover:bg-green-800 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                          >
                            <MessageSquare size={14} /> Open Chat
                          </Button>
                          <Button
                            onClick={() => setSelectedOrgForProfile(org)}
                            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition"
                          >
                            View Profile
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: MY NGO REQUESTS & CONVERSATIONS */}
            {activeSubTab === "my_requests" && (
              <div className="space-y-4">
                {loadingMyConvs ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 space-y-3">
                    <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">Loading your conversations...</p>
                  </div>
                ) : myConversations.length === 0 ? (
                  <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200/70 space-y-3">
                    <span className="text-3xl block">💬</span>
                    <h3 className="text-sm font-bold text-slate-800">No active NGO conversations yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      When you initiate a chat with a registered organization or send a rescue report, it will appear here with live tracking.
                    </p>
                    <button
                      onClick={() => setActiveSubTab("all_orgs")}
                      className="px-4 py-2 bg-green-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Browse Organizations
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className="p-4 rounded-2xl bg-white border border-slate-150 hover:border-slate-300 transition shadow-xs cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {conv.organizationLogo ? (
                            <img src={conv.organizationLogo} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 font-bold flex items-center justify-center shrink-0">
                              🐾
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-800 truncate">{conv.organizationName}</h4>
                              {conv.rescueStatus && (
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                                  conv.rescueStatus === "accepted"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : conv.rescueStatus === "reviewing"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : conv.rescueStatus === "in_progress"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : conv.rescueStatus === "resolved"
                                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                  {conv.rescueStatus.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {conv.unreadCount && conv.unreadCount > 0 ? (
                            <span className="bg-green-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                              {conv.unreadCount} new
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Open &rarr;</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EMERGENCY HELPLINES DIRECTORY */}
        {activeTab === "helplines" && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* 1962 GOVERNMENT ANIMAL DISTRESS BANNER */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 text-white shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl shrink-0">
                    1962
                  </div>
                  <div>
                    <h3 className="text-base font-black">1962 — Animal & Veterinary Distress Helpline</h3>
                    <p className="text-xs text-amber-100 font-medium">
                      Official Government of India short code for Mobile Veterinary Units (MVU).
                    </p>
                  </div>
                </div>

                <a href="tel:1962" className="shrink-0">
                  <button className="w-full sm:w-auto bg-white hover:bg-amber-50 text-orange-600 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5">
                    <Phone size={14} /> Call 1962
                  </button>
                </a>
              </div>

              {/* State-dependent guidance note */}
              <div className="bg-black/15 backdrop-blur-xs p-3 rounded-2xl text-xs text-amber-50 flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5 text-white" />
                <p className="leading-relaxed">
                  {state1962Info.message}
                </p>
              </div>
            </div>

            {/* Helpline Directory Filter Controls */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search */}
                <div className="sm:col-span-2 relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search helplines by name, city, authority (e.g. SPCA, PETA, Delhi Govt)..."
                    value={helplineSearch}
                    onChange={(e) => setHelplineSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {helplineSearch && (
                    <button onClick={() => setHelplineSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* State Dropdown */}
                <div>
                  <select
                    value={helplineState}
                    onChange={(e) => setHelplineState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                  >
                    <option value="all">📍 All States / National</option>
                    <option value="Delhi">Delhi NCR</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Haryana">Haryana</option>
                  </select>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 text-xs select-none">
                {[
                  { id: "all", label: "All Helplines" },
                  { id: "emergency", label: "🚨 Emergency" },
                  { id: "government", label: "🏛️ Government" },
                  { id: "rescue", label: "🐾 Animal Rescue" },
                  { id: "ambulance", label: "🚑 Ambulance" },
                  { id: "cruelty", label: "⚖️ Cruelty" },
                  { id: "wildlife", label: "🦌 Wildlife" },
                  { id: "veterinary", label: "🏥 Veterinary" },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setHelplineCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                      helplineCategory === c.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Helpline Cards Grid */}
            {loadingHelplines ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 space-y-3">
                <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-500">Loading verified emergency helplines...</p>
              </div>
            ) : helplines.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200/70 space-y-3">
                <span className="text-3xl block">📞</span>
                <h3 className="text-sm font-bold text-slate-800">We couldn't find a verified local emergency contact</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try selecting "All States" or call the National 1962 / PETA emergency helplines above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {helplines.map((hl) => (
                  <Card
                    key={hl.id}
                    className="p-5 rounded-3xl border border-slate-150 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 leading-snug">{hl.name}</h4>
                          <span className="text-xs text-slate-400 font-semibold block mt-0.5">
                            📍 {hl.serviceArea}
                          </span>
                        </div>
                        {getHelplineCategoryBadge(hl.category)}
                      </div>

                      {/* Verified Source & Timing */}
                      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                          <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                          <span>Source: <strong className="text-slate-800">{hl.verifiedSource}</strong></span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 font-medium">
                          <span>Hours: {hl.operatingHours}</span>
                          <span>Verified: {new Date(hl.lastVerifiedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                        </div>
                      </div>

                      {hl.notes && (
                        <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                          {hl.notes}
                        </p>
                      )}
                    </div>

                    {/* Click-to-call action */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-slate-800 tracking-tight block">
                          📞 {hl.phone}
                        </span>
                        {hl.alternatePhone && (
                          <span className="text-[10px] text-slate-400 block">
                            Alt: {hl.alternatePhone}
                          </span>
                        )}
                      </div>

                      <a href={`tel:${hl.phone.replace(/\s+/g, "")}`} className="shrink-0">
                        <Button className="bg-green-700 hover:bg-green-800 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs">
                          <PhoneCall size={13} /> Call Now
                        </Button>
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* IMPORTANT EMERGENCY DISCLAIMER */}
        <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 text-slate-500 text-xs leading-relaxed space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-amber-600 shrink-0" /> Emergency Disclaimer
          </p>
          <p className="text-[11px]">
            If an animal is in immediate life-threatening danger, contact the appropriate local police, fire rescue, or verified hospital helpline directly. StrayAid is a community coordination platform and cannot guarantee response times of third-party organizations.
          </p>
        </div>

      </div>

      {/* MODAL 1: EMERGENCY TRIAGE MODAL */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                🚨 Emergency Animal Help
              </h3>
              <button onClick={() => setShowEmergencyModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600">What type of animal emergency is happening?</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: "injured", label: "🚑 Injured Animal" },
                  { id: "accident", label: "🚗 Road Accident" },
                  { id: "trapped", label: "🐕 Animal Trapped" },
                  { id: "fire", label: "🔥 Animal in Fire" },
                  { id: "bleeding", label: "🩸 Severe Injury" },
                  { id: "wildlife", label: "🦜 Wildlife Emergency" },
                  { id: "cruelty", label: "⚠️ Animal Cruelty" },
                  { id: "abandoned", label: "🐾 Abandoned Pet" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEmergencyType(item.id)}
                    className={`p-3 rounded-2xl border text-left font-bold transition cursor-pointer ${
                      selectedEmergencyType === item.id
                        ? "bg-red-50 border-red-300 text-red-700 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Immediate recommended contacts */}
              <div className="bg-red-50/70 p-4 rounded-2xl border border-red-200 space-y-2.5 pt-3">
                <h4 className="text-xs font-black text-red-800 flex items-center gap-1.5">
                  📞 Instant Click-to-Call Emergency Lines
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-red-100">
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-800">1962 Animal Helpline</h5>
                      <span className="text-[10px] text-slate-500 font-medium">Govt Mobile Veterinary Unit</span>
                    </div>
                    <a href="tel:1962">
                      <Button className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3 rounded-lg font-bold">
                        Call 1962
                      </Button>
                    </a>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-red-100">
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-800">Delhi Animal Care 24x7</h5>
                      <span className="text-[10px] text-slate-500 font-medium">011-23967555 (Govt of Delhi)</span>
                    </div>
                    <a href="tel:01123967555">
                      <Button className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3 rounded-lg font-bold">
                        Call Now
                      </Button>
                    </a>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-red-100">
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-800">PETA India Hotline</h5>
                      <span className="text-[10px] text-slate-500 font-medium">+91 98201 22602 (24x7)</span>
                    </div>
                    <a href="tel:+919820122602">
                      <Button className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3 rounded-lg font-bold">
                        Call Now
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                setShowEmergencyModal(false);
                setActiveTab("helplines");
              }}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-2xl text-xs"
            >
              View All Verified Helplines Directory
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 2: NGO PROFILE MODAL */}
      {selectedOrgForProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {selectedOrgForProfile.logo ? (
                  <img src={selectedOrgForProfile.logo} alt="" className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-700 font-black text-xl flex items-center justify-center shrink-0">
                    {selectedOrgForProfile.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedOrgForProfile.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getOrgTypeBadge(selectedOrgForProfile.organizationType)}
                    {selectedOrgForProfile.verified && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        ✓ Verified Organization
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedOrgForProfile(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">About</h4>
                <p className="text-slate-700 font-medium leading-relaxed mt-1">{selectedOrgForProfile.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">📍 Service Area</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 block">{selectedOrgForProfile.serviceAreas.join(", ")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">🕐 Operating Hours</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 block">{selectedOrgForProfile.operatingHours}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">🚨 Emergency Response</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 block">
                    {selectedOrgForProfile.emergencyAvailable ? "🟢 Active 24/7" : "🟡 Limited"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">👥 Verified Team</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 block">{selectedOrgForProfile.members.length} Registered Staff</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Contact & Address</h4>
                <div className="mt-1.5 space-y-1 text-slate-600 font-semibold">
                  <p>📍 {selectedOrgForProfile.address}</p>
                  <p>📞 Phone: <a href={`tel:${selectedOrgForProfile.phone}`} className="text-green-700 hover:underline">{selectedOrgForProfile.phone}</a></p>
                  <p>✉️ Email: {selectedOrgForProfile.email}</p>
                  {selectedOrgForProfile.website && (
                    <p>🌐 Website: <a href={selectedOrgForProfile.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selectedOrgForProfile.website}</a></p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <Button
                onClick={() => {
                  const org = selectedOrgForProfile;
                  setSelectedOrgForProfile(null);
                  handleOpenOrgChat(org);
                }}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={14} /> Start Conversation
              </Button>
              <a href={`tel:${selectedOrgForProfile.phone}`} className="shrink-0">
                <Button className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-2xl text-xs flex items-center gap-1.5">
                  <PhoneCall size={14} /> Call
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTER NGO ONBOARDING MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Register Animal Organization</h3>
                <p className="text-xs text-slate-400 font-medium">Submit your NGO, clinic, or shelter for StrayAid verification.</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            {regSuccessMessage ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold text-center space-y-1">
                <CheckCircle size={24} className="text-emerald-600 mx-auto" />
                <p>{regSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greater Noida Stray Relief Trust"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Type *</label>
                    <select
                      value={regForm.organizationType}
                      onChange={(e) => setRegForm({ ...regForm, organizationType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="rescue_ngo">🐾 Animal Rescue NGO</option>
                      <option value="veterinary">🏥 Veterinary Clinic</option>
                      <option value="shelter">🏠 Animal Shelter</option>
                      <option value="rescue_team">🦮 Volunteer Rescue Team</option>
                      <option value="wildlife">🕊️ Wildlife Rescue</option>
                      <option value="animal_welfare">🤝 Welfare Society</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Greater Noida"
                      value={regForm.city}
                      onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">Description *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Briefly describe your services, ambulance capabilities, and animal care facilities..."
                    value={regForm.description}
                    onChange={(e) => setRegForm({ ...regForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Helpline Phone *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +91 98112 00000"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Official Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. contact@ngo.org"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">Service Areas (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Greater Noida, Pari Chowk, Sector 62, Expressway"
                    value={regForm.serviceAreas}
                    onChange={(e) => setRegForm({ ...regForm, serviceAreas: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">Physical Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Complete shelter / clinic address"
                    value={regForm.address}
                    onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-[11px] font-medium">
                  🔒 All submitted organizations are initially marked as <strong>Pending Verification</strong>. Our verification team will cross-check registration certificates before publishing the ✓ Verified badge.
                </div>

                <Button
                  type="submit"
                  disabled={submittingReg}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider"
                >
                  {submittingReg ? "Submitting Application..." : "Submit for Verification"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DRAWER: REAL-TIME PRIVATE NGO CHAT WORKSPACE */}
      {activeConversation && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl animate-slideLeft">
            
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setActiveConversation(null);
                    setChatMessages([]);
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-xl transition text-slate-600 cursor-pointer"
                >
                  <ArrowLeft size={18} />
                </button>

                {activeConversation.organizationLogo ? (
                  <img src={activeConversation.organizationLogo} alt="" className="w-10 h-10 rounded-2xl object-cover border border-slate-100 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-700 font-black flex items-center justify-center shrink-0">
                    🐾
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                    {activeConversation.organizationName}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Coordination
                    </span>
                    <span>•</span>
                    <span className="text-slate-500">🔒 Private Chat</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveConversation(null);
                  setChatMessages([]);
                }}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* RESCUE STATUS WORKFLOW CARD (if conversation is a rescue request) */}
            {activeConversation.rescueStatus && (
              <div className="bg-slate-100 p-3.5 border-b border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    🚨 Rescue Case Status:
                  </span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    activeConversation.rescueStatus === "accepted"
                      ? "bg-emerald-600 text-white"
                      : activeConversation.rescueStatus === "reviewing"
                      ? "bg-blue-600 text-white"
                      : activeConversation.rescueStatus === "in_progress"
                      ? "bg-purple-600 text-white"
                      : activeConversation.rescueStatus === "resolved"
                      ? "bg-slate-800 text-white"
                      : "bg-amber-500 text-white"
                  }`}>
                    {activeConversation.rescueStatus.replace("_", " ")}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-extrabold pt-1">
                  <div className={`p-1 rounded-lg ${activeConversation.rescueStatus ? "bg-green-700 text-white" : "bg-slate-200 text-slate-500"}`}>
                    1. Sent
                  </div>
                  <div className={`p-1 rounded-lg ${["reviewing", "accepted", "in_progress", "resolved"].includes(activeConversation.rescueStatus) ? "bg-green-700 text-white" : "bg-slate-200 text-slate-500"}`}>
                    2. Review
                  </div>
                  <div className={`p-1 rounded-lg ${["accepted", "in_progress", "resolved"].includes(activeConversation.rescueStatus) ? "bg-green-700 text-white" : "bg-slate-200 text-slate-500"}`}>
                    3. Accepted
                  </div>
                  <div className={`p-1 rounded-lg ${activeConversation.rescueStatus === "resolved" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                    4. Resolved
                  </div>
                </div>

                {/* NGO Staff Action Controls */}
                {isOrgStaff && (
                  <div className="pt-2 border-t border-slate-200 flex gap-2">
                    {activeConversation.rescueStatus === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusChange("accepted")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-xl text-[10px] cursor-pointer"
                        >
                          ✓ Accept Request
                        </button>
                        <button
                          onClick={() => handleStatusChange("declined")}
                          className="px-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1.5 rounded-xl text-[10px] cursor-pointer"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {activeConversation.rescueStatus === "accepted" && (
                      <button
                        onClick={() => handleStatusChange("in_progress")}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 rounded-xl text-[10px] cursor-pointer"
                      >
                        🚑 Mark Rescue in Progress
                      </button>
                    )}
                    {activeConversation.rescueStatus === "in_progress" && (
                      <button
                        onClick={() => handleStatusChange("resolved")}
                        className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-1.5 rounded-xl text-[10px] cursor-pointer"
                      >
                        ✅ Mark Case Resolved
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Chat Body (Scrollable messages) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              <p className="text-[10px] text-center text-slate-400 bg-slate-100 px-3 py-1 rounded-full w-max mx-auto font-bold uppercase tracking-wider">
                🔒 Private Conversation between You and {activeConversation.organizationName}
              </p>

              {loadingChat ? (
                <div className="text-center py-8 text-slate-400 text-xs font-bold animate-pulse">
                  Connecting to conversation...
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-1">
                  <span className="text-2xl block">💬</span>
                  <p className="text-xs font-bold text-slate-600">Start the conversation</p>
                  <p className="text-[10px] text-slate-400">Share location, photos, or report details below.</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === currentUserId;

                  // Render Structured Report Card
                  if (msg.messageType === "report_card" && msg.reportContext) {
                    const ctx = msg.reportContext;
                    return (
                      <div key={msg.id} className="max-w-sm mx-auto my-2 p-4 bg-white border border-emerald-200 rounded-3xl shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase">
                            🐾 Shared {ctx.status} Report
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="flex gap-3 items-start">
                          {ctx.image && (
                            <img src={ctx.image} alt="" className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 truncate">{ctx.name ? `${ctx.name} (${ctx.animalType})` : ctx.animalType}</h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">📍 {ctx.location}</p>
                            {ctx.breed && <p className="text-[10px] text-slate-400 font-medium">Breed: {ctx.breed}</p>}
                          </div>
                        </div>

                        {msg.content && msg.content !== "Shared report" && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl font-medium">
                            "{msg.content}"
                          </p>
                        )}
                      </div>
                    );
                  }

                  // Render Status Update Pill
                  if (msg.messageType === "status_update") {
                    return (
                      <div key={msg.id} className="my-2 text-center">
                        <span className="inline-block bg-slate-200 text-slate-700 text-[10px] font-extrabold px-3 py-1 rounded-full shadow-xs">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  // Standard Text Message Bubble
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 px-1 mb-0.5">
                        <span>{msg.senderName}</span>
                        <span>•</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs font-semibold leading-relaxed ${
                          isMe
                            ? "bg-green-700 text-white rounded-tr-none shadow-sm shadow-green-100"
                            : "bg-white border border-slate-150 text-slate-800 rounded-tl-none shadow-xs"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing Indicator */}
              {typingName && (
                <div className="flex flex-col mr-auto items-start max-w-[80%] animate-pulse">
                  <span className="text-[9px] font-bold text-slate-400 px-1 mb-0.5">
                    {typingName} is typing...
                  </span>
                  <div className="bg-white border border-slate-100 text-slate-400 rounded-2xl rounded-tl-none px-3.5 py-2 text-xs flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              <div ref={messageEndRef} />
            </div>

            {/* Quick Action Response Pills */}
            <div className="flex gap-1.5 overflow-x-auto px-4 py-2 border-t border-slate-100 bg-white select-none shrink-0">
              <button
                onClick={() => handleQuickReply("📍 Animal location is near Pari Chowk, Greater Noida.")}
                className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[10px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
              >
                📍 Share Location
              </button>
              <button
                onClick={() => handleQuickReply("🚑 The animal is unable to walk and needs ambulance transport.")}
                className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[10px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
              >
                🚑 Need Transport
              </button>
              <button
                onClick={() => handleQuickReply("🤝 I am on site and ready to coordinate the handover.")}
                className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[10px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
              >
                🤝 On-Site Handover
              </button>
            </div>

            {/* Chat Footer Input Form */}
            <form onSubmit={handleSendMessage} className="p-3.5 border-t border-slate-100 bg-white flex gap-2">
              <input
                type="text"
                placeholder={`Message ${activeConversation.organizationName}...`}
                value={messageText}
                onChange={handleTyping}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={!messageText.trim() || sendingMessage}
                className="p-3 bg-green-700 hover:bg-green-800 text-white rounded-2xl transition flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-100"
              >
                <Send size={15} />
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
