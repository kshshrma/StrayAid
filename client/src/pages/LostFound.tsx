import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Search, PlusCircle, Calendar, MapPin, X, User, Phone, MessageSquare } from "lucide-react";

interface LostFoundPet {
  id: string;
  type: "lost" | "found";
  animal: string;
  breed: string;
  location: string;
  date: string;
  description: string;
  image: string;
}

export default function LostFound() {
  const [filter, setFilter] = useState<"all" | "lost" | "found">("all");
  
  // Dynamic list of pets
  const [pets, setPets] = useState<LostFoundPet[]>([
    {
      id: "1",
      type: "lost",
      animal: "Dog",
      breed: "Golden Retriever",
      location: "Sector 62, Noida",
      date: "2026-08-22",
      description: "Friendly male retriever wearing a red collar. Answers to 'Max'.",
      image: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400",
    },
    {
      id: "2",
      type: "found",
      animal: "Cat",
      breed: "Persian Cat",
      location: "Indirapuram, Ghaziabad",
      date: "2026-08-23",
      description: "White fluffy Persian cat found resting under building stairs. Very calm.",
      image: "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?auto=format&fit=crop&q=80&w=400",
    },
    {
      id: "3",
      type: "lost",
      animal: "Dog",
      breed: "Beagle",
      location: "Sector 15, Noida",
      date: "2026-08-21",
      description: "Tri-color female Beagle, microchipped. Very energetic.",
      image: "https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&q=80&w=400",
    },
  ]);

  // Report Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [newType, setNewType] = useState<"lost" | "found">("lost");
  const [newAnimal, setNewAnimal] = useState("Dog");
  const [newBreed, setNewBreed] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDescription, setNewDescription] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  // Contact Modal states
  const [selectedPet, setSelectedPet] = useState<LostFoundPet | null>(null);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactMessage, setContactMessage] = useState("");

  const defaultImages: Record<string, string> = {
    dog: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400",
    cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400",
    cow: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=400",
    bird: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?auto=format&fit=crop&q=80&w=400",
    other: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&q=80&w=400",
  };

  const filteredPets = filter === "all" ? pets : pets.filter(p => p.type === filter);

  function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    if (!newBreed || !newLocation || !newDescription) {
      alert("Please fill in all fields.");
      return;
    }

    const animKey = newAnimal.toLowerCase();
    const fallbackImg = defaultImages[animKey] || defaultImages.other;
    const finalImg = newImageUrl.trim() || fallbackImg;

    const newPet: LostFoundPet = {
      id: Date.now().toString(),
      type: newType,
      animal: newAnimal,
      breed: newBreed,
      location: newLocation,
      date: newDate,
      description: newDescription,
      image: finalImg,
    };

    setPets(prev => [newPet, ...prev]);
    setIsReportModalOpen(false);

    // Reset fields
    setNewBreed("");
    setNewLocation("");
    setNewDescription("");
    setNewImageUrl("");
    setNewDate(new Date().toISOString().split("T")[0]);
  }

  function handleSendContactMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setContactMessage("");
      setSelectedPet(null);
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-5 pb-28">
      <h1 className="mb-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
        <Search className="text-green-600" size={32} /> Lost & Found
      </h1>

      <div className="max-w-md mx-auto mb-6 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            filter === "all"
              ? "bg-green-600 border-green-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Pets
        </button>
        <button
          onClick={() => setFilter("lost")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            filter === "lost"
              ? "bg-red-600 border-red-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          🚨 Lost
        </button>
        <button
          onClick={() => setFilter("found")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            filter === "found"
              ? "bg-blue-600 border-blue-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          ✅ Found
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-5">
        {filteredPets.map(pet => (
          <Card key={pet.id} className="overflow-hidden p-0 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow transition-all">
            <img src={pet.image} alt={pet.animal} className="h-48 w-full object-cover" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {pet.breed} ({pet.animal})
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    pet.type === "lost"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}
                >
                  {pet.type}
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-4">{pet.description}</p>

              <div className="flex flex-col gap-1 text-xs text-gray-500 font-medium pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-gray-400" /> {pet.location}
                </span>
                <span className="flex items-center gap-1.5 mt-1">
                  <Calendar size={14} className="text-gray-400" /> Reported: {pet.date}
                </span>
              </div>

              <Button
                onClick={() => setSelectedPet(pet)}
                className={`mt-4 w-full text-xs font-bold py-2 rounded-xl transition ${
                  pet.type === "lost"
                    ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-100"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
                }`}
              >
                {pet.type === "lost" ? "💬 Message Finder / Owner" : "📞 Contact Reporter"}
              </Button>
            </div>
          </Card>
        ))}

        <Button
          onClick={() => setIsReportModalOpen(true)}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-green-100"
        >
          <PlusCircle size={18} /> Report Lost or Found Pet
        </Button>
      </div>

      {/* REPORT PET MODAL OVERLAY */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-slideUp max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X size={18} />
            </button>

            <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-1.5">
              📢 Report Pet Case
            </h2>
            <p className="text-slate-500 text-xs mb-4">
              Help reunite pets with their owners by adding details below.
            </p>

            <form onSubmit={handleAddReport} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">CASE STATUS</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("lost")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      newType === "lost"
                        ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🚨 Lost
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("found")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      newType === "found"
                        ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    ✅ Found
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">ANIMAL TYPE</label>
                  <select
                    value={newAnimal}
                    onChange={(e) => setNewAnimal(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Dog">Dog 🐕</option>
                    <option value="Cat">Cat 🐈</option>
                    <option value="Cow">Cow 🐄</option>
                    <option value="Bird">Bird 🐦</option>
                    <option value="Other">Other 🐾</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">BREED / COLOR</label>
                  <input
                    type="text"
                    placeholder="e.g. Beagle, White Fluffy"
                    value={newBreed}
                    onChange={(e) => setNewBreed(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">LOCATION</label>
                  <input
                    type="text"
                    placeholder="e.g. Sector 62, Noida"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">DATE OBSERVED</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">IMAGE URL (OPTIONAL)</label>
                <input
                  type="url"
                  placeholder="Leave empty for generic photo or paste Unsplash URL"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">DESCRIPTION</label>
                <textarea
                  placeholder="Details like collar color, tags, behavior or where last seen..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition mt-2 shadow-md shadow-green-100"
              >
                Publish Case Report
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* CONTACT DIALOG OVERLAY */}
      {selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-scaleIn">
            <button
              onClick={() => {
                setSelectedPet(null);
                setContactSuccess(false);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X size={18} />
            </button>

            {contactSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-xl font-bold">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-slate-900">Message Dispatched!</h3>
                <p className="text-xs text-slate-500">
                  Your message has been sent to the reporter. They will reach out to you directly shortly.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                    👤
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Contact Case Reporter
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Re: {selectedPet.breed} ({selectedPet.type})
                    </p>
                  </div>
                </div>

                <div className="text-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span>Case ID: #{selectedPet.id.slice(-6)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span>Secure Relay Option Enabled</span>
                  </div>
                </div>

                <form onSubmit={handleSendContactMessage} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Quick Message
                    </label>
                    <textarea
                      placeholder={
                        selectedPet.type === "lost"
                          ? "I think I saw this pet near... Please call me!"
                          : "Hello! I am the owner of this pet. How can I contact you?"
                      }
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-xs"
                  >
                    <MessageSquare size={14} /> Send Secure Message
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

