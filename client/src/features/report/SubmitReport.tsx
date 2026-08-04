import { uploadImage } from "../../services/storage/uploadImage";
import { saveReport } from "../../services/report/saveReport";

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

      console.log("Saved Report:", result.report);
      console.log("AI Analysis:", result.ai);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to submit report.");
    }
  }

  return (
    <button
      onClick={handleSubmit}
      className="w-full rounded-2xl bg-green-600 py-4 text-lg font-semibold text-white shadow hover:bg-green-700"
    >
      Submit Report
    </button>
  );
}