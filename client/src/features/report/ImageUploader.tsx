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
          className="flex-1 flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl glass-button-secondary border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer active:scale-95 group"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200 shadow-xs">
            <Camera size={22} className="transition-transform group-hover:scale-110" />
          </div>
          <span className="text-xs font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition">
            Take Photo
          </span>
        </button>

        <button
          type="button"
          onClick={triggerGallery}
          className="flex-1 flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl glass-button-secondary border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all duration-200 cursor-pointer active:scale-95 group"
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 shadow-xs">
            <ImageIcon size={22} className="transition-transform group-hover:scale-110" />
          </div>
          <span className="text-xs font-black text-slate-800 tracking-tight group-hover:text-blue-700 transition">
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
