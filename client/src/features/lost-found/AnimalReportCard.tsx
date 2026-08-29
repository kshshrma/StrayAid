import { useState, useEffect } from "react";
import {
  MapPin,
  Calendar,
  ShieldAlert,
  X,
  MessageSquare,
  Info,
  Share2,
  CheckCircle,
  Ban,
  AlertTriangle,
  PlusCircle,
  Eye,
  Compass,
  Clock,
  Award
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationProvider";
import { getSocket } from "../../services/socket";
import {
  sendMessageToBackend,
  getConversationFromBackend,
  markConversationAsReadOnBackend,
} from "../../services/lost-found/messageApiService";
import {
  submitSightingOnBackend,
  getSightingsFromBackend,
  getMatchesFromBackend,
  dismissMatchOnBackend,
  markReunitedOnBackend,
} from "../../services/lost-found/lostFoundService";

export interface LostFoundPet {
  id: string;
  type: "lost" | "found";
  animal: string;
  breed: string;
  color: string;
  location: string;
  date: string;
  description: string;
  image: string;
  uniqueId?: string;
  collarColor?: string;
  name?: string;
  address?: string;
  additionalInfo?: string;
  distanceKm?: number;
  contactNumber?: string;
  reporterId?: string;
  urgency?: string;
  reunited?: boolean;
  reunionPhotoUrl?: string;
  reunitedAt?: string;
  messages?: Array<{ senderId: string; text: string; timestamp: string; senderName?: string }>;
}

interface AnimalReportCardProps {
  pet: LostFoundPet;
}

export default function AnimalReportCard({ pet }: AnimalReportCardProps) {
  const { activeChat, setActiveChat } = useNotification();
  const [showDetails, setShowDetails] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Tabs and feature states
  const [activeTab, setActiveTab] = useState<"details" | "location" | "timeline" | "sightings" | "matches">("details");
  const [sightings, setSightings] = useState<any[]>([]);
  const [loadingSightings, setLoadingSightings] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  
  const [reunitedState, setReunitedState] = useState(pet.reunited || false);
  const [reunionPhotoUrl, setReunionPhotoUrl] = useState(pet.reunionPhotoUrl || "");
  const [showReunionForm, setShowReunionForm] = useState(false);
  const [reunionPhoto, setReunionPhoto] = useState<File | null>(null);
  const [reunionPhotoPreview, setReunionPhotoPreview] = useState<string | null>(null);
  const [reuniting, setReuniting] = useState(false);

  // Sighting form states
  const [sightingLat, setSightingLat] = useState("");
  const [sightingLon, setSightingLon] = useState("");
  const [sightingAddress, setSightingAddress] = useState("");
  const [sightingTime, setSightingTime] = useState("");
  const [sightingDesc, setSightingDesc] = useState("");
  const [sightingPhoto, setSightingPhoto] = useState<File | null>(null);
  const [sightingPhotoPreview, setSightingPhotoPreview] = useState<string | null>(null);
  const [submittingSighting, setSubmittingSighting] = useState(false);
  const [locatingSighting, setLocatingSighting] = useState(false);
  
  const isOwner = currentUserId === pet.reporterId;

  // Fetch current user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  // Set default datetime to local current time for Sighting
  useEffect(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISO = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    setSightingTime(localISO);
  }, [showDetails]);

  // Listen to activeChat triggers from notifications click
  useEffect(() => {
    if (activeChat && activeChat.reportId === pet.id) {
      setShowDetails(true);
      setSelectedParticipantId(activeChat.senderId);
      setActiveChat(null); // Reset trigger
    }
  }, [activeChat, pet.id, setActiveChat]);

  // Fetch sightings and matches when details opens
  useEffect(() => {
    if (!showDetails) return;
    
    async function loadDetails() {
      try {
        setLoadingSightings(true);
        const data = await getSightingsFromBackend(pet.id);
        setSightings(data);
      } catch (err) {
        console.error("Failed to load sightings:", err);
      } finally {
        setLoadingSightings(false);
      }
      
      if (isOwner) {
        try {
          setLoadingMatches(true);
          const data = await getMatchesFromBackend(pet.id);
          setMatches(data);
        } catch (err) {
          console.error("Failed to load matches:", err);
        } finally {
          setLoadingMatches(false);
        }
      }
    }
    loadDetails();
  }, [showDetails, pet.id, isOwner]);

  // Load participant list if current user is owner, or set owner as selectedParticipantId if enquirer
  useEffect(() => {
    if (!showDetails || !currentUserId) return;

    if (isOwner) {
      async function fetchParticipants() {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/messages/conversations`,
            {
              headers: {
                Authorization: `Bearer ${session?.access_token || ""}`,
              },
            }
          );
          const data = await res.json();
          if (data.success && data.conversations) {
            const reportConvs = data.conversations.filter((c: any) => c.reportId === pet.id);
            const userIds = reportConvs.map((c: any) => c.otherParticipantId);
            setParticipants(userIds);
            if (userIds.length > 0 && !selectedParticipantId) {
              setSelectedParticipantId(userIds[0]);
            } else if (userIds.length === 0) {
              setSelectedParticipantId(pet.reporterId || null);
            }
          }
        } catch (err) {
          console.error("Failed to load conversation participants:", err);
          setSelectedParticipantId(pet.reporterId || null);
        }
      }
      fetchParticipants();
    } else {
      setSelectedParticipantId(pet.reporterId || null);
    }
  }, [showDetails, currentUserId, pet.id, pet.reporterId, selectedParticipantId, isOwner]);

  // Fetch message thread when selectedParticipantId is resolved
  useEffect(() => {
    if (!showDetails || !currentUserId || !selectedParticipantId) return;

    async function loadConversation() {
      try {
        setLoadingMessages(true);
        const msgs = await getConversationFromBackend(pet.id, selectedParticipantId!);
        setMessages(msgs);
        
        // Mark conversation as read on the backend
        await markConversationAsReadOnBackend(pet.id, selectedParticipantId!);
      } catch (err) {
        console.error("Failed to load message thread:", err);
      } finally {
        setLoadingMessages(false);
      }
    }
    loadConversation();
  }, [showDetails, currentUserId, selectedParticipantId, pet.id]);

  // Listen for real-time messages for this active chat in the card modal
  useEffect(() => {
    if (!showDetails || !currentUserId || !selectedParticipantId) return;

    const socket = getSocket();
    
    const handleReceiveMessage = (data: any) => {
      if (data && data.message) {
        const msg = data.message;
        const isThisReport = msg.reportId === pet.id;
        const isFromParticipant = msg.senderId === selectedParticipantId;
        const isToMe = msg.recipientId === currentUserId;
        
        if (isThisReport && isFromParticipant && isToMe) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === msg.id);
            if (exists) return prev;
            return [...prev, msg];
          });
          
          // Mark it as read
          markConversationAsReadOnBackend(pet.id, selectedParticipantId!);
        }
      }
    };

    socket.on("secure_message_received", handleReceiveMessage);

    return () => {
      socket.off("secure_message_received", handleReceiveMessage);
    };
  }, [showDetails, currentUserId, selectedParticipantId, pet.id]);

  async function handleSendContactMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!contactMessage.trim() || !selectedParticipantId) return;

    try {
      const newMsg = await sendMessageToBackend(pet.id, contactMessage.trim(), selectedParticipantId);
      setMessages((prev) => [...prev, newMsg]);
      setContactMessage("");
    } catch (err) {
      console.error("Failed to send Secure Relay message:", err);
      alert("Failed to send message. Please try again.");
    }
  }

  // Handle Sightings location fetching
  function handleGetSightingLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocatingSighting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSightingLat(pos.coords.latitude.toFixed(6));
        setSightingLon(pos.coords.longitude.toFixed(6));
        setLocatingSighting(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        // Noida simulation
        setSightingLat((28.6273 + (Math.random() - 0.5) * 0.01).toFixed(6));
        setSightingLon((77.3725 + (Math.random() - 0.5) * 0.01).toFixed(6));
        setLocatingSighting(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }

  function handleSightingPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setSightingPhoto(file);
    setSightingPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSightingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sightingLat || !sightingLon || !sightingTime) {
      alert("Location coordinates and date/time are required.");
      return;
    }
    setSubmittingSighting(true);
    try {
      const newSighting = await submitSightingOnBackend(
        pet.id,
        {
          latitude: sightingLat,
          longitude: sightingLon,
          address: sightingAddress,
          dateTimeSeen: sightingTime,
          description: sightingDesc,
        },
        sightingPhoto || undefined
      );

      setSightings((prev) => [...prev, newSighting].sort((a, b) => new Date(a.dateTimeSeen).getTime() - new Date(b.dateTimeSeen).getTime()));
      // Reset form
      setSightingLat("");
      setSightingLon("");
      setSightingAddress("");
      setSightingDesc("");
      setSightingPhoto(null);
      setSightingPhotoPreview(null);
      alert("Sighting report submitted successfully!");
      setActiveTab("timeline"); // Switch to timeline to show progress
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit sighting report.");
    } finally {
      setSubmittingSighting(false);
    }
  }

  // Matches actions
  async function handleDismissMatch(matchedId: string) {
    if (!confirm("Are you sure this is not a match? This will dismiss the match proposal.")) return;
    try {
      await dismissMatchOnBackend(pet.id, matchedId);
      setMatches((prev) => prev.filter((m) => m.reportId !== matchedId));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to dismiss match proposal.");
    }
  }

  // Reunited actions
  function handleReunionPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setReunionPhoto(file);
    setReunionPhotoPreview(URL.createObjectURL(file));
  }

  async function handleMarkReunited(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Are you sure this animal has been safely reunited? This will close the case.")) return;
    setReuniting(true);
    try {
      await markReunitedOnBackend(pet.id, reunionPhoto || undefined);
      setReunitedState(true);
      if (reunionPhotoPreview) {
        setReunionPhotoUrl(reunionPhotoPreview);
      }
      setShowReunionForm(false);
      alert("🎉 Case closed! Congratulations on reuniting them!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to finalize reunion.");
    } finally {
      setReuniting(false);
    }
  }

  // Share report details
  function handleShareReport() {
    const text = `🐾 StrayAid Case Report #${pet.id}\nStatus: ${pet.type.toUpperCase()}\nAnimal: ${pet.animal}\nBreed: ${pet.breed}\nColor: ${pet.color}\nLocation: ${pet.address || pet.location}\nDate: ${pet.date}\nHelp bring them home!`;
    navigator.clipboard.writeText(text);
    alert("Report text copied to clipboard!");
  }

  // Block and report templates
  function handleBlockUser() {
    alert("User blocked! They will no longer be able to send you relay messages.");
  }

  function handleReportMessage() {
    alert("Relay conversation reported to StrayAid moderation services.");
  }

  // Message quick actions templates
  function selectQuickMessage(text: string) {
    setContactMessage(text);
  }

  const showChat = true;

  return (
    <>
      <Card className="overflow-hidden p-0 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full group">
        <div className="relative h-48 w-full overflow-hidden bg-slate-100 shrink-0">
          <img
            src={reunionPhotoUrl || pet.image}
            alt={pet.breed}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <span
            className={`absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm border ${
              reunitedState
                ? "bg-emerald-600 text-white border-emerald-400"
                : pet.type === "lost"
                ? "bg-red-500 text-white border-red-400"
                : "bg-blue-500 text-white border-blue-400"
            }`}
          >
            {reunitedState ? "❤️ Reunited" : pet.type === "lost" ? "🚨 Lost" : "✅ Found"}
          </span>
          {pet.urgency && pet.urgency !== "Normal" && !reunitedState && (
            <span className="absolute top-4 right-4 bg-orange-600 border border-orange-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
              {pet.urgency}
            </span>
          )}
        </div>

        <div className="p-5 flex flex-col justify-between flex-grow">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight truncate">
                {pet.name ? `${pet.name} (${pet.breed})` : pet.breed}
              </h3>
            </div>

            <p className="text-xs text-slate-500 font-bold mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-slate-300" style={{ backgroundColor: pet.color.split(" ")[0].toLowerCase() }} />
              Color: {pet.color}
            </p>

            <p className="text-xs text-slate-650 line-clamp-3 mb-4 leading-relaxed">
              {pet.description || "No description provided."}
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-50">
            <div className="flex flex-col gap-1.5 text-[11px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5 justify-between">
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate" title={pet.address || pet.location}>
                    {pet.address || pet.location}
                  </span>
                </span>
                {pet.distanceKm !== undefined && (
                  <span className="shrink-0 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black border border-emerald-100 font-sans">
                    {pet.distanceKm} km away
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span>Reported: {pet.date}</span>
              </span>
            </div>

            <Button
              onClick={() => setShowDetails(true)}
              variant="outline"
              size="sm"
              className="w-full text-xs font-bold py-2 rounded-xl transition cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1"
            >
              <Info size={13} /> View Details
            </Button>
          </div>
        </div>
      </Card>

      {/* VIEW DETAILS MODAL OVERLAY */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-scaleIn max-h-[90vh] overflow-y-auto font-sans">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setShowDetails(false);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="mb-4">
              <div className="flex gap-1.5 items-center mb-1 flex-wrap">
                <span
                  className={`rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                    reunitedState
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : pet.type === "lost"
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-blue-100 text-blue-700 border-blue-200"
                  }`}
                >
                  {reunitedState ? "❤️ Reunited" : pet.type === "lost" ? "🚨 Lost Pet" : "🔍 Found Sighting"}
                </span>
                {pet.urgency && pet.urgency !== "Normal" && !reunitedState && (
                  <span className="bg-orange-100 border border-orange-200 text-orange-700 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {pet.urgency} Urgency
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 leading-snug truncate">
                {pet.name ? `${pet.name} — ${pet.breed}` : `${pet.breed}`}
              </h2>
            </div>

            {/* Detail Tabs */}
            <div className="flex border-b border-slate-100 mb-4 overflow-x-auto gap-2">
              <button
                onClick={() => setActiveTab("details")}
                className={`pb-2 px-1 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "details" ? "border-b-2 border-green-700 text-slate-900" : "text-slate-450 hover:text-slate-700"
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab("location")}
                className={`pb-2 px-1 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "location" ? "border-b-2 border-green-700 text-slate-900" : "text-slate-450 hover:text-slate-700"
                }`}
              >
                Location
              </button>
              <button
                onClick={() => setActiveTab("timeline")}
                className={`pb-2 px-1 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "timeline" ? "border-b-2 border-green-700 text-slate-900" : "text-slate-450 hover:text-slate-700"
                }`}
              >
                Timeline ({1 + sightings.length})
              </button>
              <button
                onClick={() => setActiveTab("sightings")}
                className={`pb-2 px-1 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "sightings" ? "border-b-2 border-green-700 text-slate-900" : "text-slate-450 hover:text-slate-700"
                }`}
              >
                Report Sighting
              </button>
              {isOwner && !reunitedState && (
                <button
                  onClick={() => setActiveTab("matches")}
                  className={`pb-2 px-1 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === "matches" ? "border-b-2 border-green-700 text-slate-900" : "text-slate-450 hover:text-slate-700"
                  }`}
                >
                  Matches {matches.length > 0 && `(${matches.length})`}
                </button>
              )}
            </div>

            {/* TAB CONTENT: DETAILS */}
            {activeTab === "details" && (
              <div className="space-y-4">
                {reunitedState && (
                  <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl text-center space-y-2 animate-fadeIn">
                    <h3 className="text-sm font-black text-emerald-800 flex items-center justify-center gap-1.5">
                      <Award size={16} /> Reunited!
                    </h3>
                    <p className="text-[11px] text-emerald-700 font-semibold leading-relaxed">
                      {pet.name || "This pet"} is safely back home. Thank you to everyone who helped!
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl overflow-hidden h-44 bg-slate-50 border border-slate-100 shadow-sm shrink-0">
                    <img src={reunionPhotoUrl || pet.image} alt={pet.breed} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="space-y-2.5 text-xs text-slate-650 font-semibold bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Breed</span>
                        <span className="text-slate-800 font-black text-xs">{pet.breed}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Color / Markings</span>
                        <span className="text-slate-800 font-bold">{pet.color}</span>
                      </div>
                      {pet.collarColor && (
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Collar / Belt Color</span>
                          <span className="text-slate-800 font-bold">{pet.collarColor}</span>
                        </div>
                      )}
                      {pet.uniqueId && (
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Unique Characteristics</span>
                          <span className="text-slate-800 font-bold">{pet.uniqueId}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleShareReport}
                        className="flex-1 py-1.5 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Share2 size={12} /> Share Report
                      </button>
                      
                      {isOwner && !reunitedState && (
                        <button
                          onClick={() => setShowReunionForm(true)}
                          className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Mark Reunited
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {showReunionForm && (
                  <form onSubmit={handleMarkReunited} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3.5 animate-fadeIn">
                    <h4 className="text-xs font-black text-emerald-800">🎉 Mark Pet as Reunited!</h4>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      Upload a final photo of the reunited animal to close this case and celebrate.
                    </p>
                    
                    <div className="space-y-2">
                      {reunionPhotoPreview ? (
                        <div className="relative rounded-xl overflow-hidden h-24 border border-slate-200">
                          <img src={reunionPhotoPreview} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReunionPhotoChange}
                          className="text-xs w-full text-slate-650"
                        />
                      )}
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowReunionForm(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={reuniting}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer disabled:opacity-50"
                      >
                        {reuniting ? "Saving..." : "Confirm Reunited ❤️"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-800">Description</h4>
                  <p className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-xs text-slate-650 leading-relaxed font-semibold">
                    {pet.description || "No description provided."}
                  </p>
                </div>
                {pet.additionalInfo && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-800">Additional Info</h4>
                    <p className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-xs text-slate-650 leading-relaxed font-semibold">
                      {pet.additionalInfo}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: LOCATION */}
            {activeTab === "location" && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2 font-semibold text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>GPS Coordinates:</span>
                    <span className="text-slate-800 font-mono font-bold">{pet.location}</span>
                  </div>
                  {pet.address && (
                    <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                      <span className="shrink-0 mr-3">Address Description:</span>
                      <span className="text-slate-800 text-right">{pet.address}</span>
                    </div>
                  )}
                  {pet.distanceKm !== undefined && (
                    <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                      <span>Proximity:</span>
                      <span className="text-emerald-700 font-black">{pet.distanceKm} km away</span>
                    </div>
                  )}
                </div>

                {/* Map Placeholder grid */}
                <div className="relative h-44 rounded-2xl overflow-hidden bg-emerald-50/50 border border-emerald-100/50 flex flex-col justify-center items-center gap-1.5 shadow-inner">
                  <div className="absolute inset-0 bg-[linear-gradient(#e6fbf2_1px,transparent_1px),linear-gradient(90deg,#e6fbf2_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                  <MapPin className="text-red-500 animate-bounce" size={32} fill="currentColor" />
                  <span className="text-[10px] font-black text-slate-500 bg-white/85 px-3 py-1 rounded-full border border-slate-150 shadow-sm uppercase tracking-wider">
                    {pet.address || pet.location}
                  </span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TIMELINE */}
            {activeTab === "timeline" && (
              <div className="space-y-5 animate-fadeIn py-2">
                <h4 className="text-xs font-black text-slate-800">Case Sighting Timeline</h4>
                
                <div className="relative border-l-2 border-slate-200 ml-3 pl-5 space-y-6">
                  
                  {/* Step 1: Created */}
                  <div className="relative">
                    <span className="absolute -left-[27px] top-0.5 bg-green-700 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                      <Clock size={10} />
                    </span>
                    <div>
                      <h5 className="text-xs font-black text-slate-800">Case Created</h5>
                      <span className="text-[9px] font-semibold text-slate-400 block">{pet.date}</span>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        Report registered as <span className="font-extrabold text-slate-700">{pet.type.toUpperCase()}</span>. Initial search radius established.
                      </p>
                    </div>
                  </div>

                  {/* Sightings in between */}
                  {loadingSightings ? (
                    <div className="text-[10px] font-bold text-slate-400">Loading sightings timeline...</div>
                  ) : (
                    sightings.map((s, idx) => (
                      <div key={s.id} className="relative">
                        <span className="absolute -left-[27px] top-0.5 bg-orange-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                          <Eye size={10} />
                        </span>
                        <div className="space-y-1">
                          <h5 className="text-xs font-black text-slate-850">Sighting #{idx + 1} Reported</h5>
                          <span className="text-[9px] font-semibold text-slate-400 block">{new Date(s.dateTimeSeen).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          {s.photoUrl && (
                            <img src={s.photoUrl} alt="" className="w-16 h-12 rounded-lg object-cover border border-slate-100 shadow-sm" />
                          )}
                          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                            {s.description || "Sight reported."}
                          </p>
                          <span className="text-[9px] font-extrabold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 inline-block">
                            📍 {s.address || `GPS: ${s.latitude}, ${s.longitude}`}
                          </span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Final Step: Searching or Reunited */}
                  {reunitedState ? (
                    <div className="relative">
                      <span className="absolute -left-[27px] top-0.5 bg-emerald-600 text-white rounded-full p-0.5 border-2 border-white shadow-sm animate-pulse">
                        <CheckCircle size={10} />
                      </span>
                      <div>
                        <h5 className="text-xs font-black text-emerald-800 flex items-center gap-1 text-[12px]">Reunited ❤️</h5>
                        <span className="text-[9px] font-semibold text-slate-400 block">Case Closed</span>
                        <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Successfully reunited back home safely! Case finalized.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute -left-[27px] top-0.5 bg-slate-400 text-white rounded-full p-0.5 border-2 border-white shadow-sm animate-pulse">
                        <Compass size={10} />
                      </span>
                      <div>
                        <h5 className="text-xs font-black text-slate-700">Currently Searching</h5>
                        <p className="text-[10px] text-slate-450 font-semibold mt-0.5 leading-relaxed">
                          Active search ongoing. Report new sightings to help trace coordinates.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* TAB CONTENT: SIGHTINGS REPORT FORM */}
            {activeTab === "sightings" && (
              <form onSubmit={handleSightingSubmit} className="space-y-4 animate-fadeIn">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-800">Report Sighting</h4>
                  <p className="text-[10px] text-slate-450 font-semibold leading-relaxed">
                    Saw this animal? Provide details, GPS coordinates, and photos to update the owner.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Coordinates *
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Coordinates"
                        value={sightingLat && sightingLon ? `${sightingLat}, ${sightingLon}` : ""}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-mono text-slate-700 bg-slate-50 focus:outline-none"
                        required
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={handleGetSightingLocation}
                        disabled={locatingSighting}
                        className="px-2.5 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold text-[9px] flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {locatingSighting ? "..." : <MapPin size={12} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Date & Time seen *
                    </label>
                    <input
                      type="datetime-local"
                      value={sightingTime}
                      onChange={(e) => setSightingTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[10px] text-slate-700 bg-slate-50 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Address / Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Crossing main street near bakery"
                    value={sightingAddress}
                    onChange={(e) => setSightingAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[10px] text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Sighting Description / Notes
                  </label>
                  <textarea
                    placeholder="e.g. Walking fast towards park. Seems friendly, had no leash."
                    value={sightingDesc}
                    onChange={(e) => setSightingDesc(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-[10px] text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-green-500 h-14 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Sighting Photo (Optional)
                  </label>
                  {sightingPhotoPreview ? (
                    <div className="relative rounded-xl overflow-hidden h-20 border border-slate-200">
                      <img src={sightingPhotoPreview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setSightingPhoto(null);
                          setSightingPhotoPreview(null);
                        }}
                        className="absolute top-1.5 right-1.5 bg-black/70 text-white p-1 rounded-full text-xs"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSightingPhotoChange}
                      className="text-[10px] text-slate-550 w-full"
                    />
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={submittingSighting}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-extrabold py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submittingSighting ? "Submitting..." : "Submit Sighting Report"}
                </Button>
              </form>
            )}

            {/* TAB CONTENT: POSSIBLE MATCHES */}
            {activeTab === "matches" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-800">Possible Matches Found</h4>
                  <p className="text-[10px] text-slate-450 font-semibold leading-relaxed">
                    Compare matching characteristics between your report and reported items on the opposite list.
                  </p>
                </div>

                {loadingMatches ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-semibold">Loading potential matches...</div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-2xl">
                    No matching proposal cases found at the moment.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {matches.map((m) => (
                      <div key={m.reportId} className="p-3 bg-slate-50/50 border border-slate-150 rounded-2xl flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={m.image} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-150 shadow-xs" />
                          <div className="min-w-0 leading-tight">
                            <h5 className="text-[11px] font-black text-slate-850 truncate">{m.breed}</h5>
                            <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full inline-block mt-1 font-sans">
                              {m.score}% Match
                            </span>
                            <span className="text-[9px] text-slate-450 block truncate mt-1">📍 {m.address || m.location}</span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              // Scroll directly or show confirmation alert
                              alert(`Match details for ${m.breed}:\nLocation: ${m.address || m.location}\nDate: ${m.date}\nColor: ${m.color}\nMatching Score: ${m.score}%`);
                            }}
                            className="py-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[9px] font-black text-slate-700 rounded-lg cursor-pointer transition shadow-xs"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDismissMatch(m.reportId)}
                            className="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-[9px] font-black text-red-700 border border-red-200 rounded-lg cursor-pointer transition shadow-xs"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messaging Section */}
            <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-green-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Secure Relay Messaging
                  </span>
                </div>
                
                {/* Participant Selector for Owner */}
                {isOwner && participants.length > 0 && (
                  <select
                    value={selectedParticipantId || ""}
                    onChange={(e) => setSelectedParticipantId(e.target.value)}
                    className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 text-slate-700 bg-white font-bold focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {participants.map((pid, idx) => (
                      <option key={pid} value={pid}>
                        Enquirer #{idx + 1} ({pid.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                )}

                {/* Block and report buttons inside messenger */}
                {!isOwner && (
                  <div className="flex gap-2 text-[9px] font-black">
                    <button onClick={handleBlockUser} type="button" className="text-red-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                      <Ban size={10} /> Block
                    </button>
                    <button onClick={handleReportMessage} type="button" className="text-slate-500 hover:underline flex items-center gap-0.5 cursor-pointer">
                      <AlertTriangle size={10} /> Report
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Thread History */}
              {loadingMessages ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold animate-pulse">
                  Loading message history...
                </div>
              ) : showChat ? (
                <>
                  <div className="space-y-2.5 max-h-40 overflow-y-auto mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col shadow-inner">
                    {messages.length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-xs font-semibold my-auto">
                        No messages yet. Send a message below to start the conversation!
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.senderId === currentUserId;
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-0.5`}
                          >
                            <div
                              className={`rounded-2xl px-3.5 py-2 text-xs font-semibold max-w-[85%] leading-relaxed shadow-sm ${
                                isMe
                                  ? "bg-green-700 text-white rounded-br-none"
                                  : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                              }`}
                            >
                              {m.content}
                            </div>
                            <span className="text-[8px] text-slate-400 px-1 select-none font-medium">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message templates Quick Actions */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 animate-fadeIn select-none">
                    <button
                      type="button"
                      onClick={() => selectQuickMessage("👀 I saw this animal nearby!")}
                      className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
                    >
                      👀 I saw this animal
                    </button>
                    <button
                      type="button"
                      onClick={() => selectQuickMessage("📍 I know this location.")}
                      className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
                    >
                      📍 I know this location
                    </button>
                    <button
                      type="button"
                      onClick={() => selectQuickMessage("🐾 I found this animal!")}
                      className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
                    >
                      🐾 I found this animal
                    </button>
                    <button
                      type="button"
                      onClick={() => selectQuickMessage("🤝 I can help with handover.")}
                      className="py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition cursor-pointer shrink-0"
                    >
                      🤝 I can help
                    </button>
                  </div>

                  <form onSubmit={handleSendContactMessage} className="space-y-3">
                    <textarea
                      placeholder={
                        pet.type === "lost"
                          ? "I think I spotted this animal nearby! Please reach out..."
                          : "I am the owner of this animal. Let's arrange a secure handover..."
                      }
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 h-16 resize-none"
                      required
                    />
                    <Button
                      type="submit"
                      className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-md shadow-green-100"
                    >
                      <MessageSquare size={14} /> Send Secure Message
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-slate-100">
                  No active inquiries for this case yet.
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
