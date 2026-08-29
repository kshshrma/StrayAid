import { useState, useEffect } from "react";
import { Heart, Search, PlusCircle, X } from "lucide-react";
import AnimalReportCard, { type LostFoundPet } from "../features/lost-found/AnimalReportCard";
import LostFoundFilters from "../features/lost-found/LostFoundFilters";
import LostAnimalForm from "../features/lost-found/LostAnimalForm";
import Button from "../components/ui/Button";
import { getLostFoundPets } from "../services/lost-found/lostFoundService";
import { calculateDistance } from "../utils/distance";
import { useNotification } from "../context/NotificationProvider";
import { supabase } from "../lib/supabase";

export default function LostFound() {
  const { notifications, markAsRead, addNotification, setActiveChat } = useNotification();
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
  const [showRightDropdown, setShowRightDropdown] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [pets, setPets] = useState<LostFoundPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  // Fetch active conversations when Secure Messages dropdown is opened or new messages arrive
  useEffect(() => {
    if (!showRightDropdown || !currentUserId) return;

    async function fetchConvs() {
      try {
        setLoadingConvs(true);
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
          const sorted = data.conversations.sort((a: any, b: any) => {
            if (a.unreadCount !== b.unreadCount) {
              return b.unreadCount - a.unreadCount;
            }
            return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
          });
          setConversations(sorted);
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoadingConvs(false);
      }
    }
    fetchConvs();
  }, [showRightDropdown, currentUserId, messageNotifications.length]);

  // Generate message notifications from fetched reports privately
  useEffect(() => {
    if (!currentUserId || pets.length === 0) return;

    pets.forEach((pet) => {
      // Only display messages sent to reports owned by this user
      if (pet.reporterId === currentUserId && pet.messages && pet.messages.length > 0) {
        pet.messages.forEach((msg) => {
          // Avoid duplicate notifications locally
          const messageText = `"${msg.text}" - sent by ${msg.senderName || "Someone"}`;
          const exists = notifications.some(
            (n) => n.category === "lost_found" && n.message === messageText
          );

          if (!exists) {
            addNotification({
              category: "lost_found",
              title: `✉️ Message: ${pet.name ? `${pet.name} (${pet.breed})` : pet.breed}`,
              message: messageText,
              read: false,
              imageUrl: pet.image,
              linkUrl: "/lost-found",
            });
          }
        });
      }
    });
  }, [pets, currentUserId, notifications, addNotification]);

  // Listen for real-time updates to reports to trigger re-fetching of messages
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
          // Re-fetch reports
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

  // Fetch reports and apply location-based prioritization sorting
  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const data = await getLostFoundPets();

        // If user coordinates exist, map distance Km and sort by distance ascending
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

          // Nearest location gets first priority (sort ascending)
          petsWithDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
          setPets(petsWithDistance);
        } else {
          // Sort by date descending (newest first)
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
        // Nearest location gets first priority (sort ascending)
        updatedList.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }
      return updatedList;
    });

    setIsFormOpen(false);
    setShowSuccessPopup(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 pb-24 animate-fadeIn">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* 1. PAGE HEADER */}
        <div className="text-center md:text-left space-y-1 pb-2 border-b border-slate-100">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-2">
            <Search className="text-green-700 shrink-0" size={32} /> Lost & Found
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            Help reunite lost animals with the people who love them.
          </p>
        </div>

        {/* TOP LEFT: LOST & FOUND INDICATOR */}
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

          {showLeftDropdown && newReportNotifications.length > 0 && (
            <div className="w-80 rounded-3xl bg-white/95 border border-slate-100 shadow-2xl p-4 space-y-2.5 backdrop-blur-md animate-slideRight">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">New Reports</span>
                <button onClick={() => setShowLeftDropdown(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={12} />
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {newReportNotifications.map((notif) => (
                  <div key={notif.id} className="p-2.5 rounded-2xl bg-red-50/50 border border-red-100/50 flex items-start gap-2.5 justify-between">
                    <button
                      onClick={() => {
                        markAsRead(notif.id);
                        if (newReportNotifications.length <= 1) setShowLeftDropdown(false);
                        // Scroll to the card
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
                    <button
                      onClick={() => {
                        markAsRead(notif.id);
                        if (newReportNotifications.length <= 1) setShowLeftDropdown(false);
                      }}
                      className="text-[9px] text-red-600 hover:text-red-800 font-extrabold cursor-pointer shrink-0 ml-1.5 self-center"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TOP RIGHT: SECURE RELAY MESSAGE INDICATOR */}
        <div className="fixed top-6 right-6 z-50 pointer-events-auto flex flex-col items-end gap-2">
          <button
            onClick={() => setShowRightDropdown(!showRightDropdown)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300 font-extrabold text-slate-800 text-xs cursor-pointer select-none group ${
              messageNotifications.length > 0 ? "animate-pulse" : ""
            }`}
          >
            <span>💬 Secure Messages</span>
            {messageNotifications.length > 0 && (
              <span className="bg-green-700 text-white font-black px-2 py-0.5 rounded-full text-[9px] min-w-5 text-center">
                {messageNotifications.length}
              </span>
            )}
          </button>

          {showRightDropdown && (
            <div className="w-80 rounded-3xl bg-white/95 border border-slate-100 shadow-2xl p-4 space-y-2.5 backdrop-blur-md animate-slideLeft">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Inbox Conversations</span>
                <button onClick={() => setShowRightDropdown(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={12} />
                </button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {loadingConvs ? (
                  <div className="text-center py-4 text-slate-450 text-[10px] font-bold">Loading inbox...</div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-[10px] font-bold">No conversations yet.</div>
                ) : (
                  conversations.map((conv) => {
                    const pet = pets.find((p) => p.id === conv.reportId);
                    const displayName = pet ? (pet.name ? `${pet.name} (${pet.breed})` : pet.breed) : `Report #${conv.reportId.substring(0, 5)}`;
                    const imgUrl = pet ? pet.image : "";
                    
                    return (
                      <button
                        key={`${conv.reportId}-${conv.otherParticipantId}`}
                        onClick={() => {
                          setShowRightDropdown(false);
                          
                          // Mark notifications for this report as read locally
                          messageNotifications.forEach((n) => {
                            if (n.meta?.reportId === conv.reportId && n.meta?.senderId === conv.otherParticipantId) {
                              markAsRead(n.id);
                            }
                          });

                          setActiveChat({
                            reportId: conv.reportId,
                            senderId: conv.otherParticipantId,
                          });
                          
                          const element = document.getElementById(`report-card-${conv.reportId}`);
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                        className={`w-full p-2.5 rounded-2xl flex items-start gap-2.5 hover:bg-slate-50 transition text-left cursor-pointer border ${
                          conv.unreadCount > 0 ? "bg-emerald-50/30 border-emerald-100" : "bg-white border-slate-100/50"
                        }`}
                      >
                        {imgUrl ? (
                          <img src={imgUrl} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-150 shadow-xs" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-xs">🐾</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start gap-1">
                            <h5 className="text-[11px] font-extrabold text-slate-800 truncate">{displayName}</h5>
                            {conv.unreadCount > 0 && (
                              <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5" title={conv.lastMessage}>
                            {conv.lastMessage}
                          </p>
                          <span className="text-[8px] text-slate-400 block mt-1">
                            {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. PRIMARY ACTION — PLACE THIS FIRST */}
        <div className="pt-2">
          <Button
            onClick={() => setIsFormOpen(true)}
            className="w-full md:w-auto bg-green-700 hover:bg-green-800 text-white font-extrabold py-3.5 px-8 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-green-100/80 hover:shadow-lg text-sm uppercase tracking-wider"
          >
            <PlusCircle size={18} /> Report Lost Animal
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
            /* 9. EMPTY STATES */
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
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
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
            
            {/* Paw Heart Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center animate-pulse">
              <Heart size={32} className="fill-red-500" />
            </div>

            {/* Success messaging */}
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                🐾 Report Submitted
              </h2>
              <div className="text-slate-500 text-xs font-bold space-y-1.5 leading-relaxed">
                <p className="text-slate-800 font-extrabold text-sm">
                  You showed up. A life got a chance.
                </p>
                <p>Your report may help bring them home.</p>
              </div>
            </div>

            {/* Acknowledge Button */}
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
