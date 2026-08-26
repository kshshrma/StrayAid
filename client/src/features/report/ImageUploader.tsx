import { useRef, useState, useEffect } from "react";
import { Camera, Image as ImageIcon, Check, X } from "lucide-react";

interface ImageUploaderProps {
  image: File | null;
  setImage: React.Dispatch<React.SetStateAction<File | null>>;
  uploadSource: "camera" | "gallery" | null;
  setUploadSource: React.Dispatch<React.SetStateAction<"camera" | "gallery" | null>>;
}

export default function ImageUploader({
  image,
  setImage,
  uploadSource,
  setUploadSource,
}: ImageUploaderProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // In-app Camera state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Automatically open uploader on mount if we are retaking
  useEffect(() => {
    if (!image && uploadSource === "camera") {
      triggerCamera();
    } else if (!image && uploadSource === "gallery") {
      triggerGallery();
    }
  }, [uploadSource, image]);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!event.target.files?.length) return;
    setUploadSource("gallery");
    setImage(event.target.files[0]);
  }

  async function triggerCamera() {
    setUploadSource("camera");
    try {
      // Prompt camera access with rear camera fallback
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err: any) {
      console.warn("In-app camera stream failed, falling back to system camera file input:", err);
      // Graceful fallback to file uploader
      cameraInputRef.current?.click();
    }
  }

  function triggerGallery() {
    galleryInputRef.current?.click();
  }

  function handleCapture() {
    if (!videoRef.current || !cameraStream) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `captured_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setImage(file);
          closeCamera();
        }
      }, "image/jpeg");
    }
  }

  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      <h2 className="mb-1 text-lg font-black text-slate-900">
        📸 Animal Photo
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Capture a live photo or upload an existing image from your gallery.
      </p>

      {/* Hidden inputs for fallback / gallery */}
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
        <div className="mt-4 p-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center gap-2 border border-green-100 animate-fadeIn">
          <Check size={14} /> Selected file: {image.name}
        </div>
      )}

      {/* IN-APP LIVE CAMERA VIEWPORT MODAL */}
      {isCameraOpen && cameraStream && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black p-4 animate-fadeIn">
          {/* Top Bar */}
          <div className="flex justify-between items-center text-white">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              📷 Capture Viewfinder
            </span>
            <button
              onClick={closeCamera}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full transition cursor-pointer"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Viewfinder Video Element */}
          <div className="flex-1 my-4 flex items-center justify-center overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 relative">
            <video
              ref={(ref) => {
                if (ref && cameraStream) {
                  ref.srcObject = cameraStream;
                }
                (videoRef as any).current = ref;
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Controls Footer */}
          <div className="flex justify-center items-center pb-6">
            <button
              type="button"
              onClick={handleCapture}
              className="w-20 h-20 rounded-full bg-white border-8 border-slate-800 flex items-center justify-center cursor-pointer transition transform hover:scale-105 active:scale-95 shadow-2xl"
              title="Capture Image"
            >
              <div className="w-10 h-10 rounded-full bg-red-600 animate-pulse" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
