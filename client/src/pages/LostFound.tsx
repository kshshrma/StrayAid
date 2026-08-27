import { useState, useEffect } from "react";
import { Heart, Search, PlusCircle } from "lucide-react";
import AnimalReportCard, { type LostFoundPet } from "../features/lost-found/AnimalReportCard";
import LostFoundFilters from "../features/lost-found/LostFoundFilters";
import LostAnimalForm from "../features/lost-found/LostAnimalForm";
import Button from "../components/ui/Button";
import { getLostFoundPets } from "../services/lost-found/lostFoundService";
import { calculateDistance } from "../utils/distance";
import { useNotification } from "../context/NotificationProvider";

export default function LostFound() {
  const { notifications, markAsRead } = useNotification();
  const [filter, setFilter] = useState<"all" | "lost" | "found">("all");

  const lostFoundNotifications = notifications.filter(
    (n) => n.category === "lost_found" && !n.read
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [pets, setPets] = useState<LostFoundPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

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

        {/* NOTIFICATIONS SECTION */}
        {lostFoundNotifications.length > 0 && (
          <div className="space-y-2.5 animate-fadeIn">
            {lostFoundNotifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center justify-between gap-4 p-4 rounded-3xl bg-emerald-50 border border-emerald-100/60 shadow-sm backdrop-blur-xs transition hover:shadow-md animate-slideDown"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {notif.imageUrl ? (
                    <img
                      src={notif.imageUrl}
                      alt={notif.title}
                      className="w-10 h-10 rounded-2xl object-cover shrink-0 border border-emerald-200/50 shadow-inner"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-lg shrink-0">
                      ✉️
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 leading-tight">
                      {notif.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5 truncate max-w-lg">
                      {notif.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => markAsRead(notif.id)}
                  className="shrink-0 text-[10px] text-emerald-800 hover:text-emerald-950 font-bold border border-emerald-200 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

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
                <div key={pet.id} className="h-full">
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
