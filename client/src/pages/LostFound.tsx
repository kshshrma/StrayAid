import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Search, PlusCircle, Calendar, MapPin } from "lucide-react";

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

  const mockPets: LostFoundPet[] = [
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
  ];

  const filteredPets = filter === "all" ? mockPets : mockPets.filter(p => p.type === filter);

  return (
    <div className="min-h-screen bg-slate-100 p-5 pb-28">
      <h1 className="mb-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
        <Search className="text-green-600" size={32} /> Lost & Found
      </h1>

      <div className="max-w-md mx-auto mb-6 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
            filter === "all"
              ? "bg-green-600 border-green-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Pets
        </button>
        <button
          onClick={() => setFilter("lost")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
            filter === "lost"
              ? "bg-red-600 border-red-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          🚨 Lost
        </button>
        <button
          onClick={() => setFilter("found")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
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
          <Card key={pet.id} className="overflow-hidden p-0 rounded-2xl border border-slate-100 bg-white">
            <img src={pet.image} alt={pet.animal} className="h-48 w-full object-cover" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {pet.breed} ({pet.animal})
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    pet.type === "lost"
                      ? "bg-red-100 text-red-700 border border-red-250"
                      : "bg-blue-100 text-blue-700 border border-blue-250"
                  }`}
                >
                  {pet.type}
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-4">{pet.description}</p>

              <div className="flex flex-col gap-1 text-xs text-gray-500 font-medium pt-3 border-t border-slate-50">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-gray-400" /> {pet.location}
                </span>
                <span className="flex items-center gap-1.5 mt-1">
                  <Calendar size={14} className="text-gray-400" /> Reported: {pet.date}
                </span>
              </div>
            </div>
          </Card>
        ))}

        <Button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <PlusCircle size={18} /> Report Lost or Found Pet
        </Button>
      </div>
    </div>
  );
}
