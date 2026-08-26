import { useState } from "react";
import { MapPin, Calendar, ShieldAlert, X, MessageSquare, Info } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

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
}

interface AnimalReportCardProps {
  pet: LostFoundPet;
}

export default function AnimalReportCard({ pet }: AnimalReportCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSuccess, setContactSuccess] = useState(false);

  function handleSendContactMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setContactMessage("");
      setShowDetails(false);
    }, 2500);
  }

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
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{pet.location}</span>
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
                setContactSuccess(false);
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
            <div className="border-t border-slate-100 pt-5">
              {contactSuccess ? (
                <div className="text-center py-4 bg-green-50 rounded-2xl border border-green-100 space-y-1 animate-fadeIn">
                  <div className="mx-auto w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-lg font-bold">
                    ✓
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-2">Message Dispatched!</h3>
                  <p className="text-[11px] text-slate-500">
                    Your response has been routed securely. You will be contacted shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendContactMessage} className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={14} className="text-green-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Secure Relay Messaging
                    </span>
                  </div>
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
                    <MessageSquare size={14} /> Contact Case Reporter
                  </Button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
