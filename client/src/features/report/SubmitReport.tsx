import { useEffect, useState } from "react";
import { uploadImage } from "../../services/storage/uploadImage";
import { saveReport } from "../../services/report/saveReport";
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
  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
        alert(
          "⚠️ Offline: Report saved to local queue. It will automatically upload once network connection returns."
        );
        return;
      }

      // Upload image
      const imageUrl = await uploadImage(image);

      // Save report + run AI
      const result = await saveReport({
        image_url: imageUrl,
        latitude,
        longitude,
      });

      alert(
        `✅ Report Submitted Successfully!

Animal: ${result.ai.animal_type}
Severity: ${result.ai.severity}
Priority: ${result.ai.priority}

AI Advice:
${result.ai.ai_advice}`
      );
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleSubmit}
      disabled={submitting}
      className={`w-full rounded-2xl py-4 text-lg font-semibold text-white shadow transition ${
        isOffline
          ? "bg-slate-600 hover:bg-slate-700"
          : "bg-green-600 hover:bg-green-700"
      } ${submitting ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {submitting
        ? "Submitting..."
        : isOffline
        ? "💾 Save Offline Report"
        : "Submit Report"}
    </button>
  );
}