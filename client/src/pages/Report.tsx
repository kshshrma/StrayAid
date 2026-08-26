import { useState, useEffect } from "react";
import ImageUploader from "../features/report/ImageUploader";
import ImagePreview from "../features/report/ImagePreview";
import SubmitReport from "../features/report/SubmitReport";
import Card from "../components/ui/Card";
import { Camera, MapPin, RefreshCw, Check, Loader2, AlertCircle } from "lucide-react";

export default function Report() {
  const [step, setStep] = useState(1); // 1: Capture, 2: Preview & Submit
  const [image, setImage] = useState<File | null>(null);
  
  // Location states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Automatically advance to Step 2 when an image is captured or uploaded
  useEffect(() => {
    if (image && step === 1) {
      setStep(2);
    }
  }, [image, step]);

  function handleRetake() {
    setImage(null);
    setLatitude(null);
    setLongitude(null);
    setLocationError(null);
    setLocating(false);
    setStep(1);
  }

  function handleUsePhotoAndGetLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError("Unable to retrieve location. Please check browser GPS permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 pb-24 animate-fadeIn">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            🐾 Emergency Report
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Report an animal in distress in just two simple steps.
          </p>
        </div>

        {/* STEP PROGRESS TRACKER */}
        <div className="flex items-center justify-center gap-4 max-w-xs mx-auto mb-6 bg-white border border-slate-100 p-2.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
              step === 1 ? "bg-green-600 text-white" : "bg-green-50 text-green-700"
            }`}>
              1
            </span>
            <span className={`text-xs font-bold ${step === 1 ? "text-slate-800" : "text-slate-400"}`}>Capture</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
              step === 2 ? "bg-green-600 text-white" : "bg-slate-100 text-slate-400"
            }`}>
              2
            </span>
            <span className={`text-xs font-bold ${step === 2 ? "text-slate-800" : "text-slate-400"}`}>Submit</span>
          </div>
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
              
              {/* Geolocation Loading State */}
              {locating && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center gap-2.5 text-blue-700 font-bold text-xs">
                  <Loader2 size={16} className="animate-spin" />
                  <span>📍 Automatically retrieving GPS location...</span>
                </div>
              )}

              {/* Geolocation Error State */}
              {locationError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-150 space-y-3">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                    <AlertCircle size={16} />
                    <span>{locationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUsePhotoAndGetLocation}
                    className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl transition text-[11px] cursor-pointer"
                  >
                    Retry Fetching Location
                  </button>
                </div>
              )}

              {/* Coordinates Retrieved Summary Card */}
              {latitude !== null && longitude !== null && (
                <Card className="p-4 bg-white border border-slate-100 rounded-2xl shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                    📍 Incident Location Retrieved
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                      <p className="text-[10px] text-slate-400">LATITUDE</p>
                      <p className="mt-0.5 text-slate-800">{latitude.toFixed(6)}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                      <p className="text-[10px] text-slate-400">LONGITUDE</p>
                      <p className="mt-0.5 text-slate-800">{longitude.toFixed(6)}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Interactive buttons */}
              {latitude === null && !locating ? (
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
                    onClick={handleUsePhotoAndGetLocation}
                    className="flex-1 py-3 text-xs font-bold rounded-xl bg-green-600 text-white hover:bg-green-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-green-100 border border-green-600"
                  >
                    <Check size={14} /> Use This Photo
                  </button>
                </div>
              ) : (
                latitude !== null && (
                  <div className="space-y-3">
                    <SubmitReport
                      image={image}
                      latitude={latitude}
                      longitude={longitude}
                    />

                    <button
                      type="button"
                      onClick={handleRetake}
                      className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition text-xs font-bold bg-white cursor-pointer"
                    >
                      ← Discard & Start Over
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}