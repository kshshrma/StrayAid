import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadImage } from "../../services/storage/uploadImage";
import { saveReport } from "../../services/report/saveReport";
import { Heart, Check } from "lucide-react";
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
        className={`w-full rounded-2xl py-4 text-lg font-semibold text-white shadow transition cursor-pointer ${
          isOffline
            ? "bg-slate-600 hover:bg-slate-700"
            : "bg-green-600 hover:bg-green-700 shadow-green-100"
        } ${submitting ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {submitting
          ? "Submitting..."
          : isOffline
          ? "💾 Save Offline Report"
          : "Submit Report"}
      </button>

      {/* CUSTOM SUCCESS POPUP MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-scaleIn text-center space-y-5">
            
            {/* Heart Emblem */}
            <div className="mx-auto w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center animate-pulse">
              <Heart size={32} className="fill-red-500" />
            </div>

            {/* Custom Messaging */}
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                Report Submitted! 🐾
              </h2>
              
              {isOfflineQueueMsg ? (
                <div className="text-slate-500 text-xs font-semibold space-y-1.5 leading-relaxed">
                  <p>You showed up. A life got a chance.</p>
                  <p>Thank you for caring.</p>
                  <p className="text-[10px] text-orange-600 bg-orange-50/50 p-1.5 rounded-xl border border-orange-100 mt-2">
                    💾 Saved offline. Auto-uploading when online!
                  </p>
                </div>
              ) : (
                <div className="text-slate-500 text-xs font-semibold space-y-1.5 leading-relaxed">
                  <p>You showed up. A life got a chance.</p>
                  <p>Thank you for caring.</p>
                </div>
              )}
            </div>

            {/* Acknowledge Button */}
            <button
              onClick={handleCloseModal}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-2xl transition text-xs shadow-md shadow-green-100 cursor-pointer border border-green-600"
            >
              Done
            </button>
            
          </div>
        </div>
      )}
    </>
  );
}