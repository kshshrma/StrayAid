import { useRef } from "react";
import { Camera, Image as ImageIcon, Check } from "lucide-react";

interface ImageUploaderProps {
  image: File | null;
  setImage: React.Dispatch<React.SetStateAction<File | null>>;
}

export default function ImageUploader({
  image,
  setImage,
}: ImageUploaderProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!event.target.files?.length) return;
    setImage(event.target.files[0]);
  }

  function triggerCamera() {
    cameraInputRef.current?.click();
  }

  function triggerGallery() {
    galleryInputRef.current?.click();
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      <h2 className="mb-1 text-lg font-black text-slate-900">
        📸 Animal Photo
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Capture a live photo or upload an existing image from your gallery.
      </p>

      {/* Hidden inputs */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
        ref={cameraInputRef}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        ref={galleryInputRef}
        className="hidden"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={triggerCamera}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 hover:border-green-500 hover:bg-green-50/20 rounded-2xl transition cursor-pointer group"
        >
          <Camera size={24} className="text-slate-400 group-hover:text-green-600 transition" />
          <span className="text-xs font-bold text-slate-700 group-hover:text-green-700 transition">
            Take Photo
          </span>
        </button>

        <button
          type="button"
          onClick={triggerGallery}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 rounded-2xl transition cursor-pointer group"
        >
          <ImageIcon size={24} className="text-slate-400 group-hover:text-blue-600 transition" />
          <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition">
            Upload Photo
          </span>
        </button>
      </div>

      {image && (
        <div className="mt-4 p-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center gap-2 border border-green-100">
          <Check size={14} /> Selected file: {image.name}
        </div>
      )}
    </div>
  );
}