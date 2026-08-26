import { useState, useRef } from "react";
import { X, Camera, MapPin, Loader2, AlertCircle } from "lucide-react";
import Button from "../../components/ui/Button";

interface LostAnimalFormProps {
  onClose: () => void;
  onSubmitSuccess: (newReport: any) => void;
}

export default function LostAnimalForm({
  onClose,
  onSubmitSuccess,
}: LostAnimalFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State
  const [type, setType] = useState<"lost" | "found">("lost");
  const [animal, setAnimal] = useState("Dog");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [collarColor, setCollarColor] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  // File Preview States
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Status states
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setImagePreview(URL.createObjectURL(file));
    setErrors(prev => prev.filter(err => err !== "Animal photo is required."));
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setErrors(prev => [...prev, "Geolocation is not supported by your browser."]);
      return;
    }

    setLocating(true);
    setErrors(prev => prev.filter(err => err !== "Last seen location is required."));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLocation(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        setLocating(false);
      },
      (error) => {
        console.error("GPS error, simulating coordinates:", error);
        // Fallback Noida simulation coordinates
        const simLat = 28.6273 + (Math.random() - 0.5) * 0.01;
        const simLon = 77.3725 + (Math.random() - 0.5) * 0.01;
        setLocation(`${simLat.toFixed(6)}, ${simLon.toFixed(6)}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    const validationErrors: string[] = [];
    if (!imagePreview) validationErrors.push("Animal photo is required.");
    if (!breed) validationErrors.push("Breed is required.");
    if (!color) validationErrors.push("Animal color is required.");
    if (!location) validationErrors.push("Last seen location is required.");

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      // Scroll modal container back to top to show errors
      const modalElement = document.getElementById("form-modal-container");
      if (modalElement) modalElement.scrollTop = 0;
      return;
    }

    setErrors([]);
    setSubmitting(true);

    // Simulate submission delay
    setTimeout(() => {
      const newReport = {
        id: Date.now().toString(),
        type,
        animal,
        breed,
        color,
        location,
        date: new Date().toISOString().split("T")[0],
        description: additionalInfo || `A ${color.toLowerCase()} ${breed.toLowerCase()} spotted in this area.`,
        image: imagePreview || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400",
        uniqueId: uniqueId || undefined,
        collarColor: collarColor || undefined,
        name: name || undefined,
        address: address || undefined,
        additionalInfo: additionalInfo || undefined,
      };

      setSubmitting(false);
      onSubmitSuccess(newReport);
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        id="form-modal-container"
        className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-slideUp max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        <h2 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-1.5">
          📢 Report Lost Animal
        </h2>
        <p className="text-slate-500 text-xs mb-5">
          Help reunite an animal by adding detailed description and sighting details.
        </p>

        {/* Validation Errors Header */}
        {errors.length > 0 && (
          <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl space-y-1.5">
            <h4 className="text-xs font-black text-red-800 flex items-center gap-1.5">
              <AlertCircle size={15} /> Please resolve the following errors:
            </h4>
            <ul className="list-disc list-inside text-[11px] text-red-700 font-bold space-y-0.5">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
          
          {/* SIGHTING CASE STATUS SELECTOR */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
              Case Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("lost")}
                className={`flex-1 py-2 rounded-xl border text-xs font-black transition cursor-pointer ${
                  type === "lost"
                    ? "bg-red-500 text-white border-red-500 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                🚨 Lost Pet
              </button>
              <button
                type="button"
                onClick={() => setType("found")}
                className={`flex-1 py-2 rounded-xl border text-xs font-black transition cursor-pointer ${
                  type === "found"
                    ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                ✅ Found Sighting
              </button>
            </div>
          </div>

          {/* ANIMAL PHOTO */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
              Animal Photo *
            </label>
            
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden h-40 border border-slate-200 bg-slate-50 flex items-center justify-center">
                <img src={imagePreview} alt="Animal preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1.5 rounded-full transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 hover:border-green-500 hover:bg-green-50/10 flex flex-col items-center justify-center gap-1.5 transition text-slate-400 hover:text-green-600 cursor-pointer"
              >
                <Camera size={28} />
                <span className="text-xs font-bold">Upload Photo</span>
              </button>
            )}

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* ANIMAL TYPE & BREED */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Animal Type
              </label>
              <select
                value={animal}
                onChange={(e) => setAnimal(e.target.value)}
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Breed *
              </label>
              <input
                type="text"
                placeholder="e.g. Beagle, Persian or Unknown / Mixed"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <button
                type="button"
                onClick={() => setBreed("Unknown / Mixed")}
                className="text-[9px] text-green-700 hover:underline mt-1 font-bold block text-left"
              >
                Set as Unknown / Mixed
              </button>
            </div>
          </div>

          {/* ANIMAL COLOR & UNIQUE IDENTIFIERS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Animal Color *
              </label>
              <input
                type="text"
                placeholder="e.g. Brown with white patches"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <span className="text-[9px] text-slate-400 mt-1 block">
                Describe main color and markings.
              </span>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Unique Markings (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Scars, patches, tail type"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-[9px] text-slate-400 mt-1 block">
                Spots, scars, eye color, etc.
              </span>
            </div>
          </div>

          {/* COLLAR COLOR & ANIMAL NAME */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Collar / Belt Color (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Red collar with a black buckle"
                value={collarColor}
                onChange={(e) => setCollarColor(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Animal Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Name on collar tag if any"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-[9px] text-slate-400 mt-1 block">
                Name written on collar tag.
              </span>
            </div>
          </div>

          {/* LOCATION DETAILS */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Last Seen Location *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="GPS coordinates (e.g. 28.6273, 77.3725)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                required
                readOnly
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="px-3.5 py-2.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-xl transition text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
              >
                {locating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Fetching...
                  </>
                ) : (
                  <>
                    <MapPin size={14} /> Get Coordinates
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ADDRESS DESCRIPTION */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Address (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Near XYZ Market, ABC Colony"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">
              Street name, colony, landmark, nearby shop, etc.
            </span>
          </div>

          {/* ADDITIONAL DESCRIPTION */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Additional Information (Optional)
            </label>
            <textarea
              placeholder="e.g. Last seen wearing a red collar. Responds to the name Bruno."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-2xl transition mt-4 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting Case Report...
              </>
            ) : (
              "Submit Lost Animal Report"
            )}
          </Button>

        </form>
      </div>
    </div>
  );
}
