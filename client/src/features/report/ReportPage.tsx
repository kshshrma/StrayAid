import { useState } from "react";
import ImageUploader from "./ImageUploader";
import ImagePreview from "./ImagePreview";
import LocationCard from "./LocationCard";
import SubmitReport from "./SubmitReport";

export default function ReportPage() {
  const [image, setImage] = useState<File | null>(null);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-bold">🐾 Report Animal</h1>

          <p className="mt-1 text-slate-500">
            Help an injured animal in under 10 seconds.
          </p>
        </div>

        <ImageUploader image={image} setImage={setImage} />

        <ImagePreview image={image} />

        <LocationCard
          latitude={latitude}
          longitude={longitude}
          setLatitude={setLatitude}
          setLongitude={setLongitude}
        />

        <SubmitReport image={image} />
      </div>
    </div>
  );
}