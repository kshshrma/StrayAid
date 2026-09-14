import { useState, useEffect } from "react";
import Button from "../../components/ui/Button";
import {
  ShieldCheck,
  Radio,
  Clock,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Home,
  Users,
  MessageSquare,
  MapPin,
  ChevronRight,
  Send,
  Layers,
} from "lucide-react";
import {
  fetchRescueCases,
  acceptRescueCase,
  rejectRescueCase,
  updateCaseStatusOnBackend,
  fetchCaseTimeline,
  fetchVolunteersList,
  fetchFosterMatches,
  assignVolunteerToCase,
  fetchVetClinics,
  createVetReferralOnBackend,
  startCaseConversationOnBackend,
  confirmCaseSeverityApi,
  recordCaseOutcomeApi,
  fetchCaseGroupedInbox,
  fetchConversationDetails,
  type RescueCase,
  type CaseStatus,
  type CaseTimelineEvent,
  type RescueVolunteerProfile,
  type FosterMatchResult,
  type VetClinic,
  type PaymentResponsibility,
  type CaseGroupedInboxItem,
} from "../../services/connect/caseApiService";
import { getSocket } from "../../services/socket";

interface NgoOperationsViewProps {
  currentUserId: string | null;
  ngoName?: string;
  ngoLocation?: string;
  ngoId?: string;
}

export default function NgoOperationsView({
  currentUserId,
  ngoName = "Greater Noida Rescuers",
  ngoLocation = "Greater Noida & Noida Sector 1–150",
  ngoId = "ngo-greater-noida-rescuers",
}: NgoOperationsViewProps) {
  const [activeTab, setActiveTab] = useState<"requests" | "cases" | "volunteers" | "medical" | "fosters" | "inbox">("requests");
  const [cases, setCases] = useState<RescueCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<"available" | "busy" | "offline">("available");

  // Selected Case Detail Drawer & Modals
  const [selectedCase, setSelectedCase] = useState<RescueCase | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<CaseTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Volunteer Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [volunteers, setVolunteers] = useState<RescueVolunteerProfile[]>([]);
  const [assigningVol, setAssigningVol] = useState(false);

  // Foster Matcher Modal
  const [showFosterModal, setShowFosterModal] = useState(false);
  const [fosterMatches, setFosterMatches] = useState<FosterMatchResult[]>([]);
  const [loadingFosters, setLoadingFosters] = useState(false);

  // Vet Referral Modal
  const [showVetModal, setShowVetModal] = useState(false);
  const [vetClinics, setVetClinics] = useState<VetClinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [paymentResp, setPaymentResp] = useState<PaymentResponsibility>("ngo");
  const [vetTreatmentNotes, setVetTreatmentNotes] = useState("");
  const [submittingVet, setSubmittingVet] = useState(false);

  // Case-Grouped Inbox State
  const [inboxCases, setInboxCases] = useState<CaseGroupedInboxItem[]>([]);
  const [inboxDirect, setInboxDirect] = useState<any[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);

  // Case Chat Drawer
  const [showCaseChat, setShowCaseChat] = useState(false);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // 1. Fetch Cases & Inbox
  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchRescueCases(ngoId);
      setCases(data);
    } catch (err) {
      console.error("[NgoOperations] Error loading cases:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadInbox() {
    try {
      setLoadingInbox(true);
      const data = await fetchCaseGroupedInbox(ngoId);
      setInboxCases(data.cases);
      setInboxDirect(data.directConversations);
    } catch (err) {
      console.error("[NgoOperations] Error loading inbox:", err);
    } finally {
      setLoadingInbox(false);
    }
  }

  async function openThread(convId: string) {
    try {
      const res = await fetchConversationDetails(convId);
      setActiveConversation(res.conversation);
      setChatMessages(res.messages || []);
      setShowCaseChat(true);

      const socket = getSocket();
      socket.emit("join_conversation_room", { conversationId: convId, userId: currentUserId });
    } catch (err) {
      alert("Failed to load conversation thread");
    }
  }

  async function openCaseThreadByType(
    caseItem: { caseId: string; caseNumber?: string },
    type: "CASE_GROUP" | "REPORTER_NGO" | "NGO_VOLUNTEER" | "NGO_VET",
    titleSuffix: string
  ) {
    try {
      const res = await startCaseConversationOnBackend(
        caseItem.caseId,
        type,
        `Case #${caseItem.caseNumber || caseItem.caseId} ${titleSuffix}`
      );
      setActiveConversation(res.conversation);
      setChatMessages(res.messages || []);
      setShowCaseChat(true);

      const socket = getSocket();
      socket.emit("join_conversation_room", { conversationId: res.conversation.id, userId: currentUserId });
    } catch (err) {
      alert("Failed to open communication channel");
    }
  }

  useEffect(() => {
    loadData();
    loadInbox();

    // Socket.IO real-time event listeners
    const socket = getSocket();
    if (ngoId) {
      socket.emit("join_ngo_room", ngoId);
    }

    const handleNewCase = (data: { case: RescueCase }) => {
      setCases((prev) => [data.case, ...prev.filter((c) => c.caseId !== data.case.caseId)]);
      loadInbox();
    };

    const handleStatusUpdated = (data: { case: RescueCase }) => {
      setCases((prev) => prev.map((c) => (c.caseId === data.case.caseId ? data.case : c)));
      if (selectedCase?.caseId === data.case.caseId) {
        setSelectedCase(data.case);
      }
      loadInbox();
    };

    const handleNewMessage = (data: any) => {
      loadInbox();
      if (activeConversation && data?.message?.conversationId === activeConversation.id) {
        setChatMessages((prev) => [...prev, data.message]);
      }
    };

    socket.on("new_rescue_case", handleNewCase);
    socket.on("case_assigned", handleNewCase);
    socket.on("case_status_updated", handleStatusUpdated);
    socket.on("case_accepted", handleStatusUpdated);
    socket.on("case_escalated", handleStatusUpdated);
    socket.on("new_message", handleNewMessage);
    socket.on("secure_message_received", handleNewMessage);

    return () => {
      socket.off("new_rescue_case", handleNewCase);
      socket.off("case_assigned", handleNewCase);
      socket.off("case_status_updated", handleStatusUpdated);
      socket.off("case_accepted", handleStatusUpdated);
      socket.off("case_escalated", handleStatusUpdated);
      socket.off("new_message", handleNewMessage);
      socket.off("secure_message_received", handleNewMessage);
    };
  }, [ngoId, selectedCase, activeConversation]);

  // Handle Accept
  async function handleAccept(caseId: string) {
    try {
      const updated = await acceptRescueCase(caseId, ngoId);
      setCases((prev) => prev.map((c) => (c.caseId === caseId ? updated : c)));
      if (selectedCase?.caseId === caseId) setSelectedCase(updated);
    } catch (err: any) {
      alert(err?.message || "Failed to accept case");
    }
  }

  // Handle Reject & Auto-Escalate
  async function handleReject(caseId: string) {
    const reason = prompt("Please provide a reason for declining (e.g. capacity, out of area, shelter full):", "capacity");
    if (reason === null) return;

    try {
      const updated = await rejectRescueCase(caseId, ngoId, reason);
      setCases((prev) => prev.map((c) => (c.caseId === caseId ? updated : c)));
      if (selectedCase?.caseId === caseId) setSelectedCase(updated);
      alert("Case has been declined and automatically escalated to the next eligible responder.");
    } catch (err: any) {
      alert(err?.message || "Failed to reject case");
    }
  }

  // Handle Status Transition
  async function handleStatusTransition(newStatus: CaseStatus) {
    if (!selectedCase) return;
    try {
      if (newStatus === "DECEASED") {
        const confirmed = confirm(
          "Sensitive Protocol: Recording DECEASED will preserve all medical records and audit history permanently, and deliver a compassionate notification to the reporter. Do you wish to proceed?"
        );
        if (!confirmed) return;
        const reason = prompt("Medical / field reason for recording deceased outcome:", "Animal succumbed to severe trauma despite emergency medical treatment");
        if (!reason) return;
        const updated = await recordCaseOutcomeApi(selectedCase.caseId, "DECEASED", reason);
        setCases((prev) => prev.map((c) => (c.caseId === selectedCase.caseId ? updated : c)));
        setSelectedCase(updated);
        loadTimeline(selectedCase.caseId);
        return;
      }

      if (newStatus === "RESOLVED") {
        const outcomeChoice = prompt("Select outcome type (RESOLVED, ADOPTED, or REUNITED):", "RESOLVED");
        if (!outcomeChoice) return;
        const updated = await recordCaseOutcomeApi(selectedCase.caseId, outcomeChoice as any, "Case completed");
        setCases((prev) => prev.map((c) => (c.caseId === selectedCase.caseId ? updated : c)));
        setSelectedCase(updated);
        loadTimeline(selectedCase.caseId);
        return;
      }

      const reason = prompt(`Confirm status change to ${newStatus}. Optional note:`, "");
      const updated = await updateCaseStatusOnBackend(selectedCase.caseId, newStatus, reason || undefined);
      setCases((prev) => prev.map((c) => (c.caseId === selectedCase.caseId ? updated : c)));
      setSelectedCase(updated);
      loadTimeline(selectedCase.caseId);
    } catch (err: any) {
      alert(err?.message || "Transition failed");
    }
  }

  // Load Timeline
  async function loadTimeline(caseId: string) {
    try {
      setLoadingTimeline(true);
      const events = await fetchCaseTimeline(caseId);
      setTimelineEvents(events);
    } catch (err) {
      console.error("Timeline error:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }

  // Open Case Workspace
  function openCaseWorkspace(c: RescueCase) {
    setSelectedCase(c);
    loadTimeline(c.caseId);
  }

  // Open Volunteer Assignment
  async function openVolunteerModal() {
    try {
      const list = await fetchVolunteersList();
      setVolunteers(list);
      setShowAssignModal(true);
    } catch (err) {
      alert("Failed to load volunteers");
    }
  }

  // Submit Volunteer Assignment
  async function handleAssignVolunteer(vol: RescueVolunteerProfile) {
    if (!selectedCase) return;
    setAssigningVol(true);
    try {
      await assignVolunteerToCase(selectedCase.caseId, vol.userId, vol.name, "RESCUE");
      alert(`Assigned volunteer ${vol.name} to Case #${selectedCase.caseNumber}`);
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to assign volunteer");
    } finally {
      setAssigningVol(false);
    }
  }

  // Open Foster Matcher
  async function openFosterModal() {
    if (!selectedCase) return;
    try {
      setLoadingFosters(true);
      setShowFosterModal(true);
      const matches = await fetchFosterMatches(selectedCase.caseId);
      setFosterMatches(matches);
    } catch (err) {
      alert("Failed to match fosters");
    } finally {
      setLoadingFosters(false);
    }
  }

  // Open Vet Modal
  async function openVetModal() {
    try {
      const clinics = await fetchVetClinics();
      setVetClinics(clinics);
      if (clinics.length > 0) setSelectedClinicId(clinics[0]?.id || "");
      setShowVetModal(true);
    } catch (err) {
      alert("Failed to load vet clinics");
    }
  }

  // Submit Vet Referral
  async function handleCreateVetReferral() {
    if (!selectedCase || !selectedClinicId) return;
    setSubmittingVet(true);
    try {
      await createVetReferralOnBackend(
        selectedCase.caseId,
        selectedClinicId,
        paymentResp,
        vetTreatmentNotes || undefined
      );
      alert("Structured case snapshot dispatched to partner veterinary clinic!");
      setShowVetModal(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to create vet referral");
    } finally {
      setSubmittingVet(false);
    }
  }

  // Open Case Chat
  async function openCaseChat(c: RescueCase) {
    try {
      const res = await startCaseConversationOnBackend(c.caseId, "CASE_GROUP", `Case #${c.caseNumber} Team`);
      setActiveConversation(res.conversation);
      setChatMessages(res.messages || []);
      setShowCaseChat(true);

      const socket = getSocket();
      socket.emit("join_conversation_room", { conversationId: res.conversation.id, userId: currentUserId });
    } catch (err) {
      alert("Failed to open case communication room");
    }
  }

  // Send Message in Case Chat
  async function handleSendCaseMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !activeConversation || !currentUserId || sendingMsg) return;

    setSendingMsg(true);
    try {
      const socket = getSocket();
      const newMsg = {
        id: "msg_" + Date.now(),
        conversationId: activeConversation.id,
        senderId: currentUserId,
        senderName: "NGO Coordinator",
        content: chatInput.trim(),
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      setChatMessages((prev) => [...prev, newMsg]);
      setChatInput("");

      socket.emit("send_message", {
        conversationId: activeConversation.id,
        content: newMsg.content,
        senderId: currentUserId,
      });
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setSendingMsg(false);
    }
  }

  // Filter queues
  const incomingRequests = cases.filter((c) => c.status === "PENDING_NGO_RESPONSE" || c.status === "NEW");
  const activeCases = cases.filter((c) => c.status !== "PENDING_NGO_RESPONSE" && c.status !== "RESOLVED" && c.status !== "DECEASED");
  const medicalCases = cases.filter((c) => c.status === "MEDICAL_REQUIRED" || c.status === "MEDICAL_CARE" || c.status === "MEDICAL_STALLED");
  const fosterCases = cases.filter((c) => c.status === "FOSTER_REQUIRED" || c.status === "FOSTER_ASSIGNED" || c.status === "FOSTER_UNAVAILABLE");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 pb-28 font-sans">
      
      {/* 1. TOP NGO OPERATIONS HEADER */}
      <div className="max-w-6xl mx-auto mb-6 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-2xl shadow-inner">
              🐾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{ngoName}</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 bg-sky-950/80 border border-sky-700/50 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck size={13} className="text-sky-400" /> Verified NGO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin size={12} /> {ngoLocation}
              </p>
            </div>
          </div>

          {/* Operational Availability Toggle */}
          <div className="flex items-center gap-3 bg-slate-900/80 p-2 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-2 px-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                availability === "available" ? "bg-emerald-400" : availability === "busy" ? "bg-amber-400" : "bg-slate-500"
              }`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {availability === "available" ? "🟢 Operational" : availability === "busy" ? "🟡 High Load" : "⚪ Offline"}
              </span>
            </div>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              className="bg-slate-800 text-xs font-bold text-white border border-slate-600 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="available">Available (Receive Dispatches)</option>
              <option value="busy">Busy (Queue Extended)</option>
              <option value="offline">Offline (Standby)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL ACTION QUEUES (Top Metric Pills) */}
      <div className="max-w-6xl mx-auto mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveTab("requests")}
          className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeTab === "requests"
              ? "bg-red-950/40 border-red-500 text-white shadow-lg shadow-red-950/50"
              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-400">Incoming</span>
            <Radio size={14} className="text-red-400 animate-pulse" />
          </div>
          <div className="text-xl font-black mt-2 text-white">{incomingRequests.length}</div>
        </button>

        <button
          onClick={() => setActiveTab("cases")}
          className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeTab === "cases"
              ? "bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/50"
              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400">Active Cases</span>
            <Layers size={14} className="text-amber-400" />
          </div>
          <div className="text-xl font-black mt-2 text-white">{activeCases.length}</div>
        </button>

        <button
          onClick={() => setActiveTab("medical")}
          className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeTab === "medical"
              ? "bg-sky-950/40 border-sky-500 text-white shadow-lg shadow-sky-950/50"
              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-400">Medical & Vets</span>
            <Stethoscope size={14} className="text-sky-400" />
          </div>
          <div className="text-xl font-black mt-2 text-white">{medicalCases.length}</div>
        </button>

        <button
          onClick={() => setActiveTab("fosters")}
          className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeTab === "fosters"
              ? "bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/50"
              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400">Foster Network</span>
            <Home size={14} className="text-emerald-400" />
          </div>
          <div className="text-xl font-black mt-2 text-white">{fosterCases.length}</div>
        </button>

        <button
          onClick={() => setActiveTab("volunteers")}
          className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeTab === "volunteers"
              ? "bg-indigo-950/40 border-indigo-500 text-white shadow-lg shadow-indigo-950/50"
              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400">Volunteers Pool</span>
            <Users size={14} className="text-indigo-400" />
          </div>
          <div className="text-xl font-black mt-2 text-white">42 Active</div>
        </button>

        <button
          onClick={() => {
            setActiveTab("inbox");
            loadInbox();
          }}
          className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeTab === "inbox"
              ? "bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/50"
              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-400">Case Inbox</span>
            <MessageSquare size={14} className="text-purple-400" />
          </div>
          <div className="text-xl font-black mt-2 text-white flex items-center justify-between">
            <span>{inboxCases.length}</span>
            {inboxCases.reduce((sum, c) => sum + (c.totalUnreadCount || 0), 0) > 0 && (
              <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                {inboxCases.reduce((sum, c) => sum + (c.totalUnreadCount || 0), 0)} new
              </span>
            )}
          </div>
        </button>
      </div>

      {/* 3. MAIN WORKSPACE CONTENT */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-800/40 rounded-3xl border border-slate-800">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-xs font-bold text-slate-400 mt-3">Synchronizing operations queue...</p>
          </div>
        ) : activeTab === "requests" ? (
          /* TAB 1: INCOMING REQUESTS */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                🚨 Incoming Rescue Requests ({incomingRequests.length})
              </h2>
              <span className="text-xs text-slate-400">15-minute response window enforced</span>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-800 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 opacity-60" />
                <p className="text-sm font-bold text-slate-300">All incoming rescue requests handled!</p>
                <p className="text-xs text-slate-500">New citizen reports will ring here in real time via Socket.IO.</p>
              </div>
            ) : (
              incomingRequests.map((c) => (
                <div
                  key={c.caseId}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-800/50">
                        #{c.caseNumber}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        c.priority === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}>
                        {c.priority} Priority
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> Received: {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white">
                      {c.breed || c.animalType.toUpperCase()}: {c.condition || "Rescue required"}
                    </h3>

                    <p className="text-xs text-slate-300 flex items-center gap-1.5">
                      <MapPin size={13} className="text-emerald-400 shrink-0" />
                      <span>{c.exactLocation}</span>
                    </p>

                    <div className="text-xs text-slate-400">
                      <span>Reporter: <strong className="text-slate-200">{c.reporterName || "Anonymous"}</strong></span>
                      {c.reporterPhone && <span className="ml-3">📞 {c.reporterPhone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                    <Button
                      onClick={() => handleReject(c.caseId)}
                      className="flex-1 md:flex-none py-2.5 px-4 text-xs font-bold bg-slate-700 hover:bg-red-900/60 text-slate-200 hover:text-red-200 border border-slate-600 rounded-xl cursor-pointer transition-all"
                    >
                      <XCircle size={14} className="mr-1 inline" /> Decline & Escalate
                    </Button>
                    <Button
                      onClick={() => handleAccept(c.caseId)}
                      className="flex-1 md:flex-none py-2.5 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950 cursor-pointer transition-all"
                    >
                      <CheckCircle2 size={14} className="mr-1 inline" /> Accept Case
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === "cases" ? (
          /* TAB 2: ACTIVE RESCUE CASES & OPERATIONS */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                🐾 Active Rescue Operations ({activeCases.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCases.map((c) => (
                <div
                  key={c.caseId}
                  onClick={() => openCaseWorkspace(c)}
                  className="bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/60 rounded-3xl p-5 shadow-lg cursor-pointer transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/50">
                        #{c.caseNumber}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {c.breed || c.animalType.toUpperCase()}: {c.condition || "Animal Rescue"}
                    </h3>

                    <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="text-emerald-400 shrink-0" />
                      {c.generalLocation || c.exactLocation}
                    </p>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{c.photos.length > 0 ? "📷 Has photos" : "📝 Text report"}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Button className="w-full py-2 text-xs font-bold bg-slate-700/80 group-hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center justify-center gap-1.5">
                    Manage Case <ChevronRight size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "medical" ? (
          /* TAB 3: MEDICAL & VETS */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                🏥 Medical Care & Veterinary Coordination ({medicalCases.length})
              </h2>
            </div>

            {medicalCases.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-800 space-y-2">
                <Stethoscope size={32} className="mx-auto text-sky-400 opacity-60" />
                <p className="text-sm font-bold text-slate-300">No cases currently awaiting medical attention</p>
                <p className="text-xs text-slate-500">Cases flagged as requiring medical treatment or surgery referral will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {medicalCases.map((c) => (
                  <div
                    key={c.caseId}
                    onClick={() => openCaseWorkspace(c)}
                    className="bg-slate-800/80 border border-slate-700/80 hover:border-sky-500/60 rounded-3xl p-5 shadow-lg cursor-pointer transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-lg border border-sky-800/50">
                          #{c.caseNumber}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-300">
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-white">{c.breed || c.animalType.toUpperCase()}: {c.condition}</h3>
                      <p className="text-xs text-slate-400">📍 {c.generalLocation || c.exactLocation}</p>
                    </div>
                    <Button className="w-full py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl">
                      Manage Medical Referral →
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "fosters" ? (
          /* TAB 4: FOSTER NETWORK */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                🏠 Foster Network & Placement ({fosterCases.length})
              </h2>
            </div>

            {fosterCases.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-800 space-y-2">
                <Home size={32} className="mx-auto text-emerald-400 opacity-60" />
                <p className="text-sm font-bold text-slate-300">No cases currently needing foster placement</p>
                <p className="text-xs text-slate-500">Post-surgery and recovering animals requiring temporary foster homes will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fosterCases.map((c) => (
                  <div
                    key={c.caseId}
                    onClick={() => openCaseWorkspace(c)}
                    className="bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/60 rounded-3xl p-5 shadow-lg cursor-pointer transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/50">
                          #{c.caseNumber}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300">
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-white">{c.breed || c.animalType.toUpperCase()}: {c.condition}</h3>
                      <p className="text-xs text-slate-400">📍 {c.generalLocation || c.exactLocation}</p>
                    </div>
                    <Button className="w-full py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                      Match Verified Foster →
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "volunteers" ? (
          /* TAB 5: VOLUNTEERS POOL */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                🦺 Registered Rescuers & Street Guardians Pool
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">Rohit Bansal</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full">BIKE RESCUER</span>
                </div>
                <p className="text-xs text-slate-400">📍 Alpha 1, Greater Noida (5km radius)</p>
                <p className="text-[11px] text-slate-500">12 successful field rescues • First-aid certified</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">Meenakshi Sundaram</span>
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded-full">CAR / TRANSPORT</span>
                </div>
                <p className="text-xs text-slate-400">📍 Knowledge Park, Greater Noida (10km radius)</p>
                <p className="text-[11px] text-slate-500">28 rescues • Emergency transport & large animals</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">Aditya Kumar</span>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full">ON-FOOT TRIAGE</span>
                </div>
                <p className="text-xs text-slate-400">📍 Sector 137, Noida (3km radius)</p>
                <p className="text-[11px] text-slate-500">9 rescues • Stray dog feeding & puppy securing</p>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 6: CASE-GROUPED OPERATIONS INBOX */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  📬 Case-Grouped Operations Inbox
                </h2>
                <p className="text-xs text-slate-400">
                  Case-centric communication threads organized by Animal / Rescue Operation
                </p>
              </div>
              <Button
                onClick={loadInbox}
                className="py-1.5 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl"
              >
                🔄 Refresh Inbox
              </Button>
            </div>

            {loadingInbox ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-800/40 rounded-3xl border border-slate-800">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                <p className="text-xs text-slate-400 mt-2">Loading case threads...</p>
              </div>
            ) : inboxCases.length === 0 && inboxDirect.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-800 space-y-2">
                <MessageSquare size={32} className="mx-auto text-purple-400 opacity-60" />
                <p className="text-sm font-bold text-slate-300">No active message threads yet</p>
                <p className="text-xs text-slate-500">Messages sent between citizens, guardians, vets, and NGO will appear organized by case.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Case Grouped Threads */}
                <div className="space-y-3">
                  {inboxCases.map((ci) => (
                    <div
                      key={ci.caseId}
                      className="bg-slate-800/90 border border-slate-700/90 rounded-3xl p-5 shadow-lg space-y-3 hover:border-purple-500/50 transition-all"
                    >
                      {/* Case Info Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-mono font-black text-purple-400 bg-purple-950/80 px-2.5 py-0.5 rounded-lg border border-purple-800/50">
                            #{ci.caseNumber || ci.caseId}
                          </span>
                          <span className="text-xs font-black text-white">
                            {ci.animalType?.toUpperCase()}: {ci.condition || "Rescue Case"}
                          </span>
                          {ci.status && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                              {ci.status.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {ci.totalUnreadCount > 0 && (
                            <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                              {ci.totalUnreadCount} unread
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {ci.lastMessageTimestamp
                              ? new Date(ci.lastMessageTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>
                        </div>
                      </div>

                      {/* Sub-thread Channels */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                        {/* Channel 1: Team Group Chat */}
                        <button
                          onClick={() => {
                            if (ci.threads.group) {
                              openThread(ci.threads.group.conversationId);
                            } else {
                              openCaseThreadByType(ci, "CASE_GROUP", "Team Chat");
                            }
                          }}
                          className="p-3 bg-slate-900/80 hover:bg-slate-750 border border-slate-700/80 rounded-2xl text-left cursor-pointer transition flex flex-col justify-between space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              👥 Case Group
                            </span>
                            {ci.threads.group?.unreadCount ? (
                              <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded-full">
                                {ci.threads.group.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {ci.threads.group?.lastMessage?.content || "Multi-participant team channel"}
                          </p>
                        </button>

                        {/* Channel 2: Citizen / Reporter Direct */}
                        <button
                          onClick={() => {
                            if (ci.threads.reporter) {
                              openThread(ci.threads.reporter.conversationId);
                            } else {
                              openCaseThreadByType(ci, "REPORTER_NGO", "Reporter Direct");
                            }
                          }}
                          className="p-3 bg-slate-900/80 hover:bg-slate-750 border border-slate-700/80 rounded-2xl text-left cursor-pointer transition flex flex-col justify-between space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                              👤 Citizen Direct
                            </span>
                            {ci.threads.reporter?.unreadCount ? (
                              <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded-full">
                                {ci.threads.reporter.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {ci.threads.reporter?.lastMessage?.content || "Direct private channel with reporter"}
                          </p>
                        </button>

                        {/* Channel 3: Rescuer / Guardian Direct */}
                        <button
                          onClick={() => {
                            if (ci.threads.guardian) {
                              openThread(ci.threads.guardian.conversationId);
                            } else {
                              openCaseThreadByType(ci, "NGO_VOLUNTEER", "Guardian Direct");
                            }
                          }}
                          className="p-3 bg-slate-900/80 hover:bg-slate-750 border border-slate-700/80 rounded-2xl text-left cursor-pointer transition flex flex-col justify-between space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                              🦺 Rescuer Direct
                            </span>
                            {ci.threads.guardian?.unreadCount ? (
                              <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded-full">
                                {ci.threads.guardian.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {ci.threads.guardian?.lastMessage?.content || "Direct channel with assigned rescuer"}
                          </p>
                        </button>

                        {/* Channel 4: Vet Clinic Direct */}
                        <button
                          onClick={() => {
                            if (ci.threads.vet) {
                              openThread(ci.threads.vet.conversationId);
                            } else {
                              openCaseThreadByType(ci, "NGO_VET", "Vet Consultation");
                            }
                          }}
                          className="p-3 bg-slate-900/80 hover:bg-slate-750 border border-slate-700/80 rounded-2xl text-left cursor-pointer transition flex flex-col justify-between space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              🩺 Vet Direct
                            </span>
                            {ci.threads.vet?.unreadCount ? (
                              <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded-full">
                                {ci.threads.vet.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {ci.threads.vet?.lastMessage?.content || "Direct channel with partner vet"}
                          </p>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct Inquiries & Consultations */}
                {inboxDirect.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-bold text-slate-300">💬 General Inquiries & Public Chats</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {inboxDirect.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => openThread(conv.id)}
                          className="p-4 bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 rounded-2xl cursor-pointer flex items-center justify-between transition"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white">{conv.title || "Direct NGO Consultation"}</div>
                            <p className="text-[11px] text-slate-400">Created: {new Date(conv.createdAt).toLocaleDateString()}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. CASE WORKSPACE DRAWER (Comprehensive Case Management) */}
      {selectedCase && (
        <div className="fixed inset-0 z-[10000] flex justify-end bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 text-slate-100 h-[100dvh] flex flex-col shadow-2xl overflow-y-auto border-l border-slate-800 animate-slideLeft">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-black text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-xl border border-emerald-700/60">
                  #{selectedCase.caseNumber}
                </span>
                <div>
                  <h2 className="text-base font-black text-white">
                    {selectedCase.breed || selectedCase.animalType.toUpperCase()}
                  </h2>
                  <p className="text-xs text-slate-400">Status: <strong className="text-emerald-400 uppercase">{selectedCase.status.replace(/_/g, " ")}</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => openCaseChat(selectedCase)}
                  className="py-1.5 px-3 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl flex items-center gap-1"
                >
                  <MessageSquare size={13} /> Case Chat
                </Button>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Case Details Body */}
            <div className="p-5 space-y-6 flex-1">

              {/* AI Vision Triage Advisory & Confirmation Module (Section 8) */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-purple-500/30 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    <div>
                      <h4 className="text-xs font-black text-white">AI Vision Triage (Advisory)</h4>
                      <p className="text-[10px] text-amber-400 font-semibold">⚠ AI suggestion — pending human confirmation</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                    (selectedCase as any).confirmed_severity
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                      : "bg-purple-950 text-purple-300 border border-purple-700"
                  }`}>
                    {(selectedCase as any).confirmed_severity
                      ? `Confirmed: ${(selectedCase as any).confirmed_severity}`
                      : (selectedCase as any).ai_severity
                      ? `Suggested: ${(selectedCase as any).ai_severity}`
                      : "Triage Advisory"}
                  </span>
                </div>

                {(selectedCase as any).safety_warning && (
                  <div className="p-2.5 bg-amber-950/70 border border-amber-600/70 rounded-xl text-xs text-amber-200">
                    {(selectedCase as any).safety_warning}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-700/60">
                  <span className="text-[11px] text-slate-400 font-bold">Confirm Medical Severity:</span>
                  {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={async () => {
                        try {
                          const updated = await confirmCaseSeverityApi(selectedCase.caseId, sev);
                          setSelectedCase(updated);
                          setCases((prev) => prev.map((c) => (c.caseId === updated.caseId ? updated : c)));
                          alert(`Medical severity confirmed as ${sev}. Case priority updated.`);
                        } catch (err: any) {
                          alert(err?.message || "Failed to confirm severity");
                        }
                      }}
                      className={`py-1 px-2.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        (selectedCase as any).confirmed_severity === sev
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  ⚡ State Machine Transitions:
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusTransition("RESCUE_IN_PROGRESS")}
                    className="py-2 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl cursor-pointer"
                  >
                    🚀 Rescue In Progress
                  </button>
                  <button
                    onClick={() => handleStatusTransition("ANIMAL_SECURED")}
                    className="py-2 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer"
                  >
                    🐾 Animal Secured
                  </button>
                  <button
                    onClick={() => handleStatusTransition("MEDICAL_CARE")}
                    className="py-2 px-3 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl cursor-pointer"
                  >
                    🏥 Under Medical Care
                  </button>
                  <button
                    onClick={() => handleStatusTransition("RECOVERY")}
                    className="py-2 px-3 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl cursor-pointer"
                  >
                    🏠 In Recovery / Foster
                  </button>
                  <button
                    onClick={() => handleStatusTransition("RESOLVED")}
                    className="py-2 px-3 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl cursor-pointer"
                  >
                    ✅ Case Resolved
                  </button>
                  <button
                    onClick={() => handleStatusTransition("DECEASED")}
                    className="py-2 px-3 text-xs font-bold bg-red-900 hover:bg-red-800 text-red-200 rounded-xl cursor-pointer"
                  >
                    🖤 Record Deceased
                  </button>
                </div>
              </div>

              {/* Action Modules: Volunteer, Foster, Vet Referral */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={openVolunteerModal}
                  className="p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-2xl text-left cursor-pointer transition"
                >
                  <Users size={16} className="text-emerald-400 mb-1" />
                  <div className="text-xs font-black text-white">Assign Volunteer</div>
                  <div className="text-[11px] text-slate-400">Dispatch local rescuer</div>
                </button>

                <button
                  onClick={openFosterModal}
                  className="p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-2xl text-left cursor-pointer transition"
                >
                  <Home size={16} className="text-purple-400 mb-1" />
                  <div className="text-xs font-black text-white">Foster Matcher</div>
                  <div className="text-[11px] text-slate-400">Transparent criteria</div>
                </button>

                <button
                  onClick={openVetModal}
                  className="p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-2xl text-left cursor-pointer transition"
                >
                  <Stethoscope size={16} className="text-sky-400 mb-1" />
                  <div className="text-xs font-black text-white">Vet Referral</div>
                  <div className="text-[11px] text-slate-400">Case snapshot & billing</div>
                </button>
              </div>

              {/* Photos */}
              {selectedCase.photos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400">Animal Evidence Photos:</h4>
                  <div className="flex gap-2 overflow-x-auto">
                    {selectedCase.photos.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="Rescue"
                        className="w-32 h-32 object-cover rounded-2xl border border-slate-700 shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Location & Reporter details */}
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">📍 Exact Location:</span>
                  <span className="font-bold text-white text-right">{selectedCase.exactLocation}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">👤 Citizen Reporter:</span>
                  <span className="font-bold text-white">{selectedCase.reporterName || "Anonymous"}</span>
                </div>
                {selectedCase.reporterPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">📞 Phone Contact:</span>
                    <span className="font-bold text-emerald-400">{selectedCase.reporterPhone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">💳 Payment Responsibility:</span>
                  <span className="font-bold uppercase text-amber-400">{selectedCase.paymentResponsibility}</span>
                </div>
              </div>

              {/* Immutable Audit Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} className="text-emerald-400" /> Immutable Case Audit Trail
                </h4>

                {loadingTimeline ? (
                  <div className="text-xs text-slate-500">Loading audit history...</div>
                ) : (
                  <div className="space-y-2.5 border-l-2 border-slate-700 pl-4 ml-2">
                    {timelineEvents.map((evt) => (
                      <div key={evt.eventId} className="space-y-0.5 text-xs relative">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 absolute -left-[21px] top-1.5" />
                        <div className="flex items-center justify-between text-slate-300 font-bold">
                          <span>{evt.type.replace(/_/g, " ")}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {evt.reason && <p className="text-slate-400 text-[11px]">{evt.reason}</p>}
                        <span className="text-[10px] text-slate-500">Actor: {evt.actorName || evt.actorRole || "System"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 5. VOLUNTEER ASSIGNMENT MODAL */}
      {showAssignModal && selectedCase && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Assign Rescue Volunteer to #{selectedCase.caseNumber}</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {volunteers.map((vol) => (
                <div
                  key={vol.userId}
                  className="p-3.5 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{vol.name}</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/60">
                        {vol.vehicle.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">📍 {vol.location} ({vol.radiusKm}km radius)</p>
                    <p className="text-[10px] text-slate-500">Handles: {vol.speciesHandled.join(", ")}</p>
                  </div>

                  <Button
                    disabled={assigningVol}
                    onClick={() => handleAssignVolunteer(vol)}
                    className="py-2 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                  >
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. FOSTER MATCHER MODAL (Transparent Criteria) */}
      {showFosterModal && selectedCase && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Foster Compatibility Matcher</h3>
                <p className="text-xs text-slate-400">Evaluating verified local fosters based on space, medical training & pets</p>
              </div>
              <button onClick={() => setShowFosterModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingFosters ? (
                <div className="text-center py-8 text-xs text-slate-400">Analyzing foster profiles...</div>
              ) : (
                fosterMatches.map((m) => (
                  <div
                    key={m.foster.userId}
                    className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-white">{m.foster.name}</h4>
                        <p className="text-[11px] text-slate-400">📍 {m.foster.location}</p>
                      </div>
                      <Button
                        onClick={() => {
                          alert(`Contacted foster ${m.foster.name}. Confidential handoff address released to coordinator.`);
                          setShowFosterModal(false);
                        }}
                        className="py-1.5 px-3.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl"
                      >
                        Request Placement
                      </Button>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-slate-700/60 text-[11px]">
                      {m.compatibilityFactors.map((f, idx) => (
                        <div key={idx} className={`flex items-center justify-between ${
                          f.isWarning ? "text-amber-400" : f.isCompatible ? "text-emerald-400" : "text-red-400"
                        }`}>
                          <span>{f.label}:</span>
                          <span className="font-semibold">{f.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. VET REFERRAL MODAL (Case Snapshot) */}
      {showVetModal && selectedCase && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Refer Case #{selectedCase.caseNumber} to Vet Clinic</h3>
              <button onClick={() => setShowVetModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Select Partner Clinic:</label>
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                >
                  {vetClinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.is24x7Emergency ? "24/7 Emergency" : c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Payment Responsibility:</label>
                <select
                  value={paymentResp}
                  onChange={(e) => setPaymentResp(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                >
                  <option value="ngo">NGO Direct Account</option>
                  <option value="reporter">Reporter Direct Payment</option>
                  <option value="donor">Sponsor / Donor Billing</option>
                  <option value="pro_bono">Pro-Bono / Subsidized Trust</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Specific Treatment Instructions:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Emergency X-Ray of right hind leg, wound cleaning and anti-rabies vaccination"
                  value={vetTreatmentNotes}
                  onChange={(e) => setVetTreatmentNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <Button
                disabled={submittingVet}
                onClick={handleCreateVetReferral}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl"
              >
                {submittingVet ? "Dispatching..." : "Send Structured Snapshot & Refer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. CASE GROUP CHAT DRAWER */}
      {showCaseChat && activeConversation && (
        <div className="fixed inset-0 z-[10020] flex justify-end bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 h-[100dvh] flex flex-col shadow-2xl border-l border-slate-800 animate-slideLeft">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
              <div>
                <h3 className="text-sm font-black text-white">{activeConversation.title || "Case Coordination Chat"}</h3>
                <span className="text-[10px] text-slate-400">Multi-participant team room</span>
              </div>
              <button onClick={() => setShowCaseChat(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
              {chatMessages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed space-y-1 ${
                      isMe ? "bg-emerald-700 text-white rounded-tr-xs" : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-xs"
                    }`}>
                      <div className="text-[10px] font-bold opacity-75">{msg.senderName || "Team Member"}</div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className="text-[9px] opacity-60 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendCaseMessage} className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Message team..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || sendingMsg}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-40"
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
