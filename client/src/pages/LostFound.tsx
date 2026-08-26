import { useState } from "react";
import { Heart, Search, PlusCircle } from "lucide-react";
import AnimalReportCard, { type LostFoundPet } from "../features/lost-found/AnimalReportCard";
import LostFoundFilters from "../features/lost-found/LostFoundFilters";
import LostAnimalForm from "../features/lost-found/LostAnimalForm";
import Button from "../components/ui/Button";

export default function LostFound() {
  const [filter, setFilter] = useState<"all" | "lost" | "found">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Realistic mock data incorporating optional details
  const [pets, setPets] = useState<LostFoundPet[]>([
    {
      id: "lf-1",
      type: "lost",
      animal: "Dog",
      breed: "Golden Retriever",
      name: "Max",
      color: "Golden / Light Brown",
      collarColor: "Red collar with a brass tag",
      uniqueId: "Dark spot on left hind leg, floppy ears",
      location: "28.627311, 77.372545",
      address: "Near Block B Park, Sector 62, Noida",
      date: "2026-08-22",
      description: "Super friendly, responds to 'Max'. Went missing during evening walk.",
      image: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400",
      additionalInfo: "Microchipped, wearing a red collar. Please contact relay if seen.",
    },
    {
      id: "lf-2",
      type: "found",
      animal: "Cat",
      breed: "Persian Cat",
      color: "Fluffy White",
      uniqueId: "Blue eyes, bushy tail",
      location: "28.635901, 77.359211",
      address: "Staircase of Building C, Indirapuram, Ghaziabad",
      date: "2026-08-23",
      description: "Calm white Persian cat found resting. Safe with security.",
      image: "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?auto=format&fit=crop&q=80&w=400",
      additionalInfo: "No collar, very clean, likely a house pet.",
    },
    {
      id: "lf-3",
      type: "lost",
      animal: "Dog",
      breed: "Beagle",
      name: "Bella",
      color: "Tri-color (Black, Brown, White)",
      collarColor: "Blue nylon belt",
      uniqueId: "Brown spots on white stomach patches",
      location: "28.583210, 77.316890",
      address: "Near Sector 15 Metro Station, Noida",
      date: "2026-08-21",
      description: "Very energetic female Beagle. Friendly but easily scared by loud noises.",
      image: "https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&q=80&w=400",
      additionalInfo: "Answers to 'Bella'. Wearing a blue collar without tag.",
    },
  ]);

  const filteredPets = filter === "all" ? pets : pets.filter((pet) => pet.type === filter);

  function handleFormSubmitSuccess(newReport: LostFoundPet) {
    // Prepend new report
    setPets((prev) => [newReport, ...prev]);
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
          {filteredPets.length === 0 ? (
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
