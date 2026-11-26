import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadImage } from "../../services/storage/uploadImage";
import { saveReport } from "../../services/report/saveReport";
import { Heart } from "lucide-react";
import {
  enqueueReport,
  getQueuedReports,
  dequeueReport,
} from "../../services/storage/offlineQueue";

interface SubmitReportProps {
  image: File | null;
  latitude: number | null;
  longitude: number | null;
}

export default function SubmitReport({
  image,
  latitude,
  longitude,
}: SubmitReportProps) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Custom Modal States
  const [showSuccess, setShowSuccess] = useState(false);
  const [isOfflineQueueMsg, setIsOfflineQueueMsg] = useState(false);

  useEffect(() => {
    function updateStatus() {
      setIsOffline(!navigator.onLine);
    }

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  async function syncOfflineQueue() {
    try {
      const reports = await getQueuedReports();
      if (reports.length === 0) return;

      console.log(`[Queue Sync] Found ${reports.length} offline reports to upload`);

      for (const r of reports) {
        // Upload image
        const imageUrl = await uploadImage(r.image);

        // Save report + run AI
        const result = await saveReport({
          image_url: imageUrl,
          latitude: r.latitude,
          longitude: r.longitude,
        });

        console.log(`[Queue Sync] Sync complete for report:`, result);

        // Remove from IndexedDB
        await dequeueReport(r.id);
      }

      alert("📶 Connection restored! Your locally queued reports have been successfully uploaded.");
    } catch (error) {
      console.error("[Queue Sync] Failed syncing offline queue:", error);
    }
  }

  useEffect(() => {
    if (navigator.onLine) {
      syncOfflineQueue();
    }

    window.addEventListener("online", syncOfflineQueue);
    return () => {
      window.removeEventListener("online", syncOfflineQueue);
    };
  }, []);

  async function handleSubmit() {
    if (!image) {
      alert("Please select an image.");
      return;
    }

    if (latitude === null || longitude === null) {
      alert("Location not available.");
      return;
    }

    try {
      setSubmitting(true);

      // Check connectivity status
      if (!navigator.onLine) {
        // Queue report locally
        await enqueueReport(image, latitude, longitude);
        setIsOfflineQueueMsg(true);
        setShowSuccess(true);
        return;
      }

      // Upload image
      const imageUrl = await uploadImage(image);

      // Save report + run AI
      await saveReport({
        image_url: imageUrl,
        latitude,
        longitude,
      });

      setIsOfflineQueueMsg(false);
      setShowSuccess(true);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseModal() {
    setShowSuccess(false);
    navigate("/");
  }

  return (
    <>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={`w-full rounded-2xl py-4 px-6 text-base font-extrabold text-white shadow-xl transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-2.5 active:scale-95 ${
          isOffline
            ? "glass-button-secondary text-slate-800"
            : "glass-button-primary shadow-emerald-700/30"
        } ${submitting ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {submitting ? (
          <>
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span>Submitting Rescue Alert...</span>
          </>
        ) : isOffline ? (
          <>
            <span>💾 Save Offline Report</span>
          </>
        ) : (
          <>
            <span>Submit Emergency Report 🚀</span>
          </>
        )}
      </button>

      {/* CUSTOM SUCCESS POPUP MODAL (FROSTED GLASS) */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm glass-card rounded-3xl p-7 border border-white/80 shadow-2xl animate-scaleIn text-center space-y-5">
            
            {/* Heart Emblem */}
            <div className="mx-auto w-16 h-16 rounded-3xl glass-button-secondary text-rose-500 flex items-center justify-center border border-rose-200 shadow-md">
              <Heart size={32} className="fill-rose-500 animate-pulse" />
            </div>

            {/* Custom Messaging */}
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                Report Submitted! 🐾
              </h2>
              
              {isOfflineQueueMsg ? (
                <div className="text-slate-600 text-xs font-semibold space-y-1.5 leading-relaxed">
                  <p>You showed up. A life got a chance.</p>
                  <p>Thank you for caring.</p>
                  <p className="text-[11px] text-amber-700 bg-amber-500/10 p-2 rounded-2xl border border-amber-500/20 mt-2 font-bold">
                    💾 Saved offline. Auto-uploading when back online!
                  </p>
                </div>
              ) : (
                <div className="text-slate-600 text-xs font-semibold space-y-1.5 leading-relaxed">
                  <p>You showed up. A life got a chance.</p>
                  <p>Thank you for caring.</p>
                </div>
              )}
            </div>

            {/* Acknowledge Glass Button */}
            <button
              onClick={handleCloseModal}
              className="w-full glass-button-primary font-bold py-3.5 rounded-2xl transition-all duration-200 text-sm shadow-lg shadow-emerald-700/25 cursor-pointer active:scale-95"
            >
              Done
            </button>
            
          </div>
        </div>
      )}
    </>
  );
}