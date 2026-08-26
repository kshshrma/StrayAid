import { useState, useEffect } from "react";
import ImageUploader from "../features/report/ImageUploader";
import ImagePreview from "../features/report/ImagePreview";
import LocationCard from "../features/report/LocationCard";
import SubmitReport from "../features/report/SubmitReport";
import Card from "../components/ui/Card";
import { Camera, MapPin, RefreshCw, Check } from "lucide-react";

export default function Report() {
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Automatically advance to Step 2 (Preview) when an image is uploaded or captured
  useEffect(() => {
    if (image && step === 1) {
      setStep(2);
    }
  }, [image, step]);

  function handleRetake() {
    setImage(null);
    setStep(1);
  }

  function handleConfirmPhoto() {
    setStep(3);
  }

  function handleLocationProceed() {
    if (latitude !== null && longitude !== null) {
      setStep(4);
    }
  }

  function handleStartOver() {
    setImage(null);
    setLatitude(null);
    setLongitude(null);
    setStep(1);
  }

  const steps = [
    { num: 1, label: "Capture" },
    { num: 2, label: "Preview" },
    { num: 3, label: "Location" },
    { num: 4, label: "Submit" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 pb-24 animate-fadeIn">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            🐾 Emergency Report
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Quick 4-step wizard to report an animal in distress.
          </p>
        </div>

        {/* STEP PROGRESS TRACKER */}
        <div className="flex justify-between items-center max-w-xs mx-auto mb-8 relative px-2">
          {/* Progress background line */}
          <div className="absolute left-4 right-4 h-0.5 bg-slate-200 top-1/2 -translate-y-1/2 z-0" />
          {/* Progress filled line */}
          <div 
            className="absolute left-4 h-0.5 bg-green-600 top-1/2 -translate-y-1/2 z-0 transition-all duration-300" 
            style={{ width: `${((step - 1) / (steps.length - 1)) * 88}%` }}
          />
          
          {steps.map((s) => (
            <div key={s.num} className="z-10 flex flex-col items-center gap-1.5">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 border ${
                  step >= s.num 
                    ? "bg-green-600 border-green-600 text-white shadow-sm shadow-green-100" 
                    : "bg-white border-slate-200 text-slate-400"
                }`}
              >
                {s.num}
              </div>
              <span className={`text-[10px] font-bold ${step >= s.num ? "text-slate-800" : "text-slate-400"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* STEP VIEWS */}
        <div className="space-y-6">
          {step === 1 && (
            <div className="animate-fadeIn">
              <ImageUploader image={image} setImage={setImage} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-slideUp">
              <ImagePreview image={image} />
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-3 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                >
                  <RefreshCw size={14} /> Retake Photo
                </button>
                
                <button
                  type="button"
                  onClick={handleConfirmPhoto}
                  className="flex-1 py-3 text-xs font-bold rounded-xl bg-green-600 text-white hover:bg-green-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-green-100 border border-green-600"
                >
                  <Check size={14} /> Use This Photo
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-slideUp">
              <LocationCard
                latitude={latitude}
                longitude={longitude}
                setLatitude={setLatitude}
                setLongitude={setLongitude}
              />

              {latitude !== null && longitude !== null && (
                <button
                  type="button"
                  onClick={handleLocationProceed}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-green-100 border border-green-600 text-xs font-semibold"
                >
                  Confirm Location & Proceed
                </button>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl transition text-xs font-bold bg-white cursor-pointer"
              >
                ← Back to Photo Preview
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-slideUp">
              <Card className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2">
                  📝 Report Summary
                </h3>

                <div className="flex gap-3">
                  {image && (
                    <img
                      src={URL.createObjectURL(image)}
                      alt="Captured animal"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-100"
                    />
                  )}
                  <div className="space-y-2 text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Camera size={14} className="text-slate-400" />
                      <span>Photo Captured Successfully</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin size={14} className="text-slate-400" />
                      <span>
                        Coordinates: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-3">
                <SubmitReport
                  image={image}
                  latitude={latitude}
                  longitude={longitude}
                />

                <button
                  type="button"
                  onClick={handleStartOver}
                  className="w-full py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl transition text-xs font-bold bg-white cursor-pointer"
                >
                  🗑️ Discard & Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}