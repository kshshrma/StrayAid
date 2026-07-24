import { uploadImage } from "../../services/storage/uploadImage";

interface SubmitReportProps {
  image: File | null;
}

export default function SubmitReport({ image }: SubmitReportProps) {
  async function handleSubmit() {
    console.log("Button clicked");

    if (!image) {
      alert("Please select an image.");
      return;
    }

    console.log("Before upload");

    try {
      const imageUrl = await uploadImage(image);

      console.log("After upload");
      console.log("Image URL:", imageUrl);

      alert("Upload successful!");
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(error?.message || "Upload failed");
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