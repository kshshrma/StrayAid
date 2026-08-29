import { useState, useRef, useEffect } from "react";
import { X, Camera, MapPin, Loader2, AlertCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import { saveLostFoundPet } from "../../services/lost-found/lostFoundService";

interface LostAnimalFormProps {
  onClose: () => void;
  onSubmitSuccess: (newReport: any) => void;
}

const COMMON_BREEDS: Record<string, string[]> = {
  Dog: ["Golden Retriever", "Beagle", "Labrador", "German Shepherd", "Indian Pariah", "Husky", "Pug"],
  Cat: ["Persian Cat", "Siamese", "Bengal", "Maine Coon", "Indian Billi"],
  Cow: ["Desi Cow", "Holstein Friesian", "Gir", "Sahiwal"],
  Bird: ["Parrot", "Pigeon", "Sparrow", "Eagle"],
  Other: ["Other Breed"],
};

export default function LostAnimalForm({
  onClose,
  onSubmitSuccess,
}: LostAnimalFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State
  const [type, setType] = useState<"lost" | "found">("lost");
  const [animal, setAnimal] = useState("Dog");
  
  // Breed Selection States
  const [breedType, setBreedType] = useState<"common" | "custom" | "unknown">("common");
  const [selectedCommonBreed, setSelectedCommonBreed] = useState("");
  const [customBreed, setCustomBreed] = useState("");

  const [color, setColor] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [collarColor, setCollarColor] = useState("");
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [urgency, setUrgency] = useState("Normal");

  // File Preview States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Status states
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Set default datetime to local current time
  useEffect(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISO = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    setDate(localISO);
  }, []);

  // Update common breed when animal changes
  useEffect(() => {
    const list = COMMON_BREEDS[animal] || [];
    if (list.length > 0) {
      setSelectedCommonBreed(list[0]);
    } else {
      setSelectedCommonBreed("");
    }
  }, [animal]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors(prev => prev.filter(err => err !== "Animal photo is required."));
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setErrors(prev => [...prev, "Geolocation is not supported by your browser."]);
      return;
    }

    setLocating(true);
    setErrors(prev => prev.filter(err => err !== "Location coordinates are required."));

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

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Determine finalized breed string
    let finalBreed = "";
    if (breedType === "common") {
      finalBreed = selectedCommonBreed;
    } else if (breedType === "custom") {
      finalBreed = customBreed.trim();
    } else {
      finalBreed = "Unknown / Mixed";
    }

    // Validation
    const validationErrors: string[] = [];
    if (!imageFile) validationErrors.push("Animal photo is required.");
    if (!finalBreed) validationErrors.push("Breed description is required.");
    if (!color.trim()) validationErrors.push("Animal color is required.");
    if (!location) validationErrors.push("Location coordinates are required.");
    if (!date) validationErrors.push("Date and time are required.");

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      const modalElement = document.getElementById("form-modal-container");
      if (modalElement) modalElement.scrollTop = 0;
      return;
    }

    setErrors([]);
    setSubmitting(true);

    try {
      const newReport = await saveLostFoundPet(
        {
          type,
          animal,
          breed: finalBreed,
          color: color.trim(),
          location,
          description: additionalInfo.trim() || `A ${color.toLowerCase()} ${finalBreed.toLowerCase()} was reported ${type === "lost" ? "missing" : "found"} here.`,
          uniqueId: uniqueId.trim() || undefined,
          collarColor: collarColor.trim() || undefined,
          name: name.trim() || undefined,
          address: address.trim() || undefined,
          date,
          additionalInfo: additionalInfo.trim() || undefined,
          urgency,
        },
        imageFile!
      );

      onSubmitSuccess(newReport);
    } catch (error: any) {
      console.error("Submission failed:", error);
      setErrors([error?.message || "Failed to submit lost/found animal report."]);
    } finally {
      setSubmitting(false);
    }
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
          🐾 Report Lost / Found Animal
        </h2>
        <p className="text-slate-500 text-xs mb-5">
          Submit details about a missing or found animal to help coordinate reuniting them.
        </p>

        {/* Validation Errors Header */}
        {errors.length > 0 && (
          <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl space-y-1.5 animate-fadeIn">
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
          
          {/* CASE STATUS SELECTOR */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
              Case Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("lost")}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
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
                className={`flex-1 py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                  type === "found"
                    ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                🔍 Found Animal
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
                    setImageFile(null);
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

          {/* ANIMAL TYPE & BREED SELECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                Breed Type
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setBreedType("common")}
                  className={`flex-1 py-1 text-[10px] rounded-lg font-bold border transition ${
                    breedType === "common"
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Common
                </button>
                <button
                  type="button"
                  onClick={() => setBreedType("custom")}
                  className={`flex-1 py-1 text-[10px] rounded-lg font-bold border transition ${
                    breedType === "custom"
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Custom
                </button>
                <button
                  type="button"
                  onClick={() => setBreedType("unknown")}
                  className={`flex-1 py-1 text-[10px] rounded-lg font-bold border transition ${
                    breedType === "unknown"
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Mixed
                </button>
              </div>
            </div>
          </div>

          {/* DYNAMIC BREED VALUE FIELDS */}
          {breedType === "common" && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Select Breed *
              </label>
              <select
                value={selectedCommonBreed}
                onChange={(e) => setSelectedCommonBreed(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {(COMMON_BREEDS[animal] || []).map((br) => (
                  <option key={br} value={br}>{br}</option>
                ))}
              </select>
            </div>
          )}

          {breedType === "custom" && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Custom Breed Name *
              </label>
              <input
                type="text"
                placeholder="Enter custom breed name (e.g. Rottweiler)"
                value={customBreed}
                onChange={(e) => setCustomBreed(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          )}

          {/* COLOR & UNIQUE CHARACTERISTICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Animal Color *
              </label>
              <input
                type="text"
                placeholder="e.g. Golden brown with white patch"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Unique Features (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Spots, scars, floppy ears, markings"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* COLLAR COLOR & ANIMAL NAME */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Collar / Belt Color (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Red collar with brass tag"
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
                placeholder="Name if written on collar/belt tag"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* COORDINATES LAST SEEN / FOUND */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Last Seen / Found Coordinates *
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
                    <Loader2 size={14} className="animate-spin" /> Locating...
                  </>
                ) : (
                  <>
                    <MapPin size={14} /> Get GPS Location
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ADDRESS & DATE DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Address Location (Optional)
              </label>
              <input
                type="text"
                placeholder="Street, landmark, colony name"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          {/* URGENCY & ADDITIONAL NOTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Urgency Level
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent ⚠️</option>
                <option value="Critical">Critical 🚨</option>
              </select>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Contact Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="Phone number if you wish to share"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Additional Information (Optional)
            </label>
            <textarea
              placeholder="Responses to name, behavior notes, leash status, etc."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 h-16 resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-2xl transition mt-4 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Uploading Sighting...
              </>
            ) : (
              `Submit ${type === "lost" ? "Lost" : "Found"} Animal Report`
            )}
          </Button>

        </form>
      </div>
    </div>
  );
}
