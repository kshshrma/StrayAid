import { useState } from "react";
import { MapPin, Calendar, ShieldAlert, X, MessageSquare, Info } from "lucide-react";
import { useEffect } from "react";
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

  // Fetch current user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  // Listen to activeChat triggers from notifications click
  useEffect(() => {
    if (activeChat && activeChat.reportId === pet.id) {
      setShowDetails(true);
      setSelectedParticipantId(activeChat.senderId);
      setActiveChat(null); // Reset trigger
    }
  }, [activeChat, pet.id, setActiveChat]);

  // Load participant list if current user is owner, or set owner as selectedParticipantId if enquirer
  useEffect(() => {
    if (!showDetails || !currentUserId) return;

    const isOwner = currentUserId === pet.reporterId;

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
  }, [showDetails, currentUserId, pet.id, pet.reporterId, selectedParticipantId]);

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
    socket.off("secure_message_received");
    socket.on("secure_message_received", (data: any) => {
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
    });

    return () => {
      socket.off("secure_message_received");
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

  const isOwner = currentUserId === pet.reporterId;
  const showChat = true;

  return (
    <>
      <Card className="overflow-hidden p-0 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full group">
        <div className="relative h-48 w-full overflow-hidden bg-slate-100 shrink-0">
          <img
            src={pet.image}
            alt={pet.breed}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <span
            className={`absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm border ${
              pet.type === "lost"
                ? "bg-red-500 text-white border-red-400"
                : "bg-blue-500 text-white border-blue-400"
            }`}
          >
            {pet.type === "lost" ? "🚨 Lost" : "✅ Found"}
          </span>
        </div>

        <div className="p-5 flex flex-col justify-between flex-grow">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {pet.name ? `${pet.name} (${pet.breed})` : pet.breed}
              </h3>
            </div>

            <p className="text-xs text-slate-500 font-bold mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-slate-300" style={{ backgroundColor: pet.color.split(" ")[0].toLowerCase() }} />
              Color: {pet.color}
            </p>

            <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
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
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-scaleIn max-h-[90vh] overflow-y-auto">
            
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
              <span
                className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider border mb-2 ${
                  pet.type === "lost"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-blue-100 text-blue-700 border-blue-200"
                }`}
              >
                {pet.type === "lost" ? "🚨 Lost Animal Case" : "✅ Found Animal Sightings"}
              </span>
              <h2 className="text-2xl font-black text-slate-900 leading-snug">
                {pet.name ? `${pet.name} — ${pet.breed}` : `${pet.breed}`}
              </h2>
            </div>

            {/* Image & Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="rounded-2xl overflow-hidden h-44 bg-slate-50 border border-slate-100">
                <img src={pet.image} alt={pet.breed} className="w-full h-full object-cover" />
              </div>
              
              <div className="space-y-2.5 text-xs text-slate-600 font-semibold bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Breed</span>
                  <span className="text-slate-800 font-bold">{pet.breed}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Animal Color & Markings</span>
                  <span className="text-slate-800 font-bold">{pet.color}</span>
                </div>
                {pet.collarColor && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Collar / Belt Color</span>
                    <span className="text-slate-800 font-bold">{pet.collarColor}</span>
                  </div>
                )}
                {pet.uniqueId && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Unique Identifiers</span>
                    <span className="text-slate-800 font-bold">{pet.uniqueId}</span>
                  </div>
                )}
                {pet.contactNumber && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Contact Number</span>
                    <span className="text-slate-800 font-bold">{pet.contactNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Geolocation Details */}
            <div className="space-y-2 mb-5">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <MapPin size={14} className="text-green-600" /> Sighting Location Details
              </h4>
              <div className="text-xs bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1 font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>GPS Coordinates:</span>
                  <span className="text-slate-800 font-mono">{pet.location}</span>
                </div>
                {pet.address && (
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1.5">
                    <span className="shrink-0 mr-3">Address Description:</span>
                    <span className="text-slate-800 text-right">{pet.address}</span>
                  </div>
                )}
                {pet.distanceKm !== undefined && (
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1.5">
                    <span>Proximity Distance:</span>
                    <span className="text-emerald-700 font-black font-sans">{pet.distanceKm} km away</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description & Additional Info */}
            <div className="space-y-2.5 mb-6 text-xs leading-relaxed text-slate-600 font-semibold">
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 mb-1">Description</h4>
                <p className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">{pet.description || "No description provided."}</p>
              </div>
              {pet.additionalInfo && (
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 mb-1">Additional Information</h4>
                  <p className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">{pet.additionalInfo}</p>
                </div>
              )}
            </div>

            {/* Messaging Section */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
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
              </div>

              {/* Chat Thread History */}
              {loadingMessages ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  Loading message history...
                </div>
              ) : showChat ? (
                <>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col">
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

                  <form onSubmit={handleSendContactMessage} className="space-y-3">
                    <textarea
                      placeholder={
                        pet.type === "lost"
                          ? "I think I spotted this animal nearby! Please reach out..."
                          : "I am the owner of this animal. Let's arrange a secure handover..."
                      }
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none"
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
