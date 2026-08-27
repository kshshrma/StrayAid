import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  MapPin,
  ShieldAlert,
  Bell,
  User,
  Phone,
  Building,
  Image as ImageIcon,
  Sparkles,
  Lock,
  X,
  LogOut,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { createProfile } from "../../services/profile/createProfile";
import { getProfile } from "../../services/profile/getProfile";
import { updateProfile } from "../../services/profile/updateProfile";
import { getGuardian } from "../../services/guardian/getGuardian";
import { createGuardian } from "../../services/guardian/createGuardian";
import { updateGuardian } from "../../services/guardian/updateGuardian";

const AVATAR_PRESETS = [
  "https://i.pravatar.cc/150?img=5",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
];

export default function ProfileForm() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);

  // Profile Form Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("https://i.pravatar.cc/150?img=5");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  
  // Custom Profile Camera & Photo Choice States
  const [isPhotoOptionsOpen, setIsPhotoOptionsOpen] = useState(false);
  const [profileCameraStream, setProfileCameraStream] = useState<MediaStream | null>(null);
  const [isProfileCameraOpen, setIsProfileCameraOpen] = useState(false);
  const profileVideoRef = useRef<HTMLVideoElement>(null);

  // App Permissions State
  const [cameraPermission, setCameraPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Guardian & Notification State
  const [isGuardian, setIsGuardian] = useState(false);
  const [guardianAvailable, setGuardianAvailable] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [notifyNearbyRescues, setNotifyNearbyRescues] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [guardianLoading, setGuardianLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Get current auth session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          console.log("No active session. Redirecting to login...");
          navigate("/login");
          return;
        }

        const user = session.user;
        setUserId(user.id);

        // Fetch User Profile
        const profile = await getProfile(user.id);
        if (profile) {
          setProfileExists(true);
          setFullName(profile.full_name ?? "");
          setPhone(profile.phone ?? "");
          setCity(profile.city ?? "");
          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
        }

        // Fetch Guardian Status
        try {
          const guardian = await getGuardian(user.id);
          if (guardian) {
            setIsGuardian(true);
            setGuardianAvailable(guardian.available);
          }
        } catch (gErr) {
          console.log("Guardian profile not created yet:", gErr);
        }

        // Check browser permissions
        checkPermissions();
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [navigate]);

  function checkPermissions() {
    // Check location permission state
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          setLocationPermission(result.state as any);
        })
        .catch(() => {});

      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((result) => {
          setCameraPermission(result.state as any);
        })
        .catch(() => {});
    }
  }

  async function handleToggleLocationPermission() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    if (locationPermission === "granted") {
      setLocationPermission("prompt");
      setLocationCoords(null);
      alert("Location permission preference toggled.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationPermission("granted");
        setLocationCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        alert("📍 Location permission granted! Nearby stray reports will be tailored to your city.");
      },
      (err) => {
        console.error("Location permission denied:", err);
        setLocationPermission("denied");
        alert("Location access denied. Please allow location permissions in your browser settings.");
      }
    );
  }

  async function handleToggleCameraPermission() {
    if (cameraPermission === "granted") {
      setCameraPermission("prompt");
      alert("Camera permission preference reset.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermission("granted");
      // Stop stream immediately after test
      stream.getTracks().forEach((track) => track.stop());
      alert("📷 Camera permission granted! You can now capture photos directly when reporting animals.");
    } catch (err) {
      console.error("Camera permission error:", err);
      setCameraPermission("denied");
      alert("Camera access denied or unavailable. Please check your browser permissions.");
    }
  }

  async function handleAvatarCameraClick() {
    try {
      // Prompt user for camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setProfileCameraStream(stream);
      setIsProfileCameraOpen(true);
      setCameraPermission("granted");
      setIsPhotoOptionsOpen(false); // Close choice modal if open
    } catch (err) {
      console.error("Camera access failed in profile avatar click:", err);
      setCameraPermission("denied");
      // Fallback: show the preset avatar picker
      setIsPhotoOptionsOpen(false);
      setShowAvatarPicker(true);
      alert("Camera access is required to capture a live profile picture. Please enable it in browser settings.");
    }
  }

  function handleProfileCapture() {
    if (!profileVideoRef.current || !profileCameraStream) return;

    const video = profileVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setAvatarUrl(dataUrl);
      closeProfileCamera();
    }
  }

  function closeProfileCamera() {
    if (profileCameraStream) {
      profileCameraStream.getTracks().forEach((track) => track.stop());
    }
    setProfileCameraStream(null);
    setIsProfileCameraOpen(false);
  }

  async function handleToggleGuardianStatus() {
    if (!userId) return;

    try {
      setGuardianLoading(true);

      if (!isGuardian) {
        // Registering as a Guardian for the first time
        let lat = locationCoords?.lat ?? null;
        let lon = locationCoords?.lon ?? null;

        await createGuardian({
          user_id: userId,
          latitude: lat,
          longitude: lon,
          available: true,
          bio: `StrayAid Rescuer in ${city || "local area"}`,
          experience: "Community Guardian",
        });

        setIsGuardian(true);
        setGuardianAvailable(true);
        setShowSuccessModal(true);
      } else {
        // Toggling availability (Guardian Mode ON/OFF)
        const nextAvailable = !guardianAvailable;
        await updateGuardian(userId, { available: nextAvailable });
        setGuardianAvailable(nextAvailable);
        
        if (nextAvailable) {
          setShowSuccessModal(true);
        } else {
          alert("Guardian Mode turned OFF. You will not receive nearby rescue notifications.");
        }
      }
    } catch (error: any) {
      console.error("Failed to update guardian status:", error);
      alert(error?.message || "Failed to update Guardian status.");
    } finally {
      setGuardianLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      alert("Please login first.");
      navigate("/login");
      return;
    }

    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    try {
      setSaving(true);

      if (profileExists) {
        await updateProfile(userId, {
          full_name: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          avatar_url: avatarUrl,
        });

        alert("Profile updated successfully!");
      } else {
        await createProfile({
          id: userId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          avatar_url: avatarUrl,
          role: "citizen",
        });

        setProfileExists(true);
        alert("Profile created successfully!");
      }
    } catch (error: any) {
      console.error("Profile save error:", error);
      alert(error?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      setSaving(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      alert("Signed out successfully!");
      navigate("/login");
    } catch (error: any) {
      console.error("Sign out error:", error);
      alert(error?.message || "Failed to sign out.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      
      {/* Card Wrapper */}
      <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-100 space-y-6">

        {/* Profile Header & Avatar Picture Update */}
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-24 w-24">
            <img
              src={avatarUrl}
              alt={fullName || "Profile"}
              className="h-24 w-24 rounded-full object-cover border-4 border-emerald-500 shadow-md"
            />
            <button
              type="button"
              onClick={() => setIsPhotoOptionsOpen(true)}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition cursor-pointer"
              title="Update profile picture"
            >
              <Camera size={16} />
            </button>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">
            {fullName || "User Profile"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {city ? `📍 ${city}` : "StrayAid Community Member"}
          </p>

          {/* Avatar Preset Selector */}
          {showAvatarPicker && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-200 animate-fadeIn text-left space-y-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-emerald-600" /> Choose Profile Picture
              </h4>

              <div className="flex gap-3 justify-center overflow-x-auto py-1">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <img
                    key={idx}
                    src={preset}
                    alt={`Avatar preset ${idx + 1}`}
                    onClick={() => {
                      setAvatarUrl(preset);
                      setShowAvatarPicker(false);
                    }}
                    className={`h-12 w-12 rounded-full object-cover cursor-pointer border-2 transition transform hover:scale-110 ${
                      avatarUrl === preset ? "border-emerald-600 ring-2 ring-emerald-200" : "border-slate-200"
                    }`}
                  />
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Or paste custom image URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={customAvatarInput}
                    onChange={(e) => setCustomAvatarInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customAvatarInput.trim()) {
                        setAvatarUrl(customAvatarInput.trim());
                        setShowAvatarPicker(false);
                        setCustomAvatarInput("");
                      }
                    }}
                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CHOOSE PROFILE PHOTO OPTIONS DIALOG */}
          {isPhotoOptionsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
              <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-scaleIn text-center space-y-4">
                <button
                  onClick={() => setIsPhotoOptionsOpen(false)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
                
                <h3 className="text-base font-bold text-slate-900">
                  Update Profile Picture
                </h3>
                <p className="text-xs text-slate-500">
                  Select how you want to update your community avatar photo.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAvatarCameraClick}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-100 border border-emerald-600"
                  >
                    <Camera size={16} /> Take Photo with Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPhotoOptionsOpen(false);
                      setShowAvatarPicker(true);
                    }}
                    className="w-full py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                  >
                    <ImageIcon size={16} className="text-slate-400" /> Choose Preset Avatar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* IN-APP CAMERA FOR PROFILE PICTURE VIEWPORT */}
          {isProfileCameraOpen && profileCameraStream && (
            <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black p-4 animate-fadeIn">
              <div className="flex justify-between items-center text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  📷 Snap Profile Photo
                </span>
                <button
                  onClick={closeProfileCamera}
                  className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full transition cursor-pointer"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {/* Viewfinder Circle Crop */}
              <div className="flex-1 my-4 flex items-center justify-center overflow-hidden bg-slate-950 relative rounded-3xl border border-slate-800">
                <div className="w-64 h-64 rounded-full border-4 border-emerald-500 overflow-hidden relative shadow-2xl">
                  <video
                    ref={(ref) => {
                      if (ref && profileCameraStream) {
                        ref.srcObject = profileCameraStream;
                      }
                      // Keep local ref too
                      (profileVideoRef as any).current = ref;
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-2 left-0 right-0 text-center">
                  <span className="text-[10px] text-slate-400 font-semibold bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-800/50">
                    Position your face in the circle
                  </span>
                </div>
              </div>

              <div className="flex justify-center items-center pb-6">
                <button
                  type="button"
                  onClick={handleProfileCapture}
                  className="w-20 h-20 rounded-full bg-white border-8 border-slate-800 flex items-center justify-center cursor-pointer transition transform hover:scale-105 active:scale-95 shadow-2xl"
                  title="Snap Photo"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-600 animate-pulse" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Information Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <User size={16} className="text-emerald-600" /> Personal Details
          </h3>

          {/* Full Name */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User size={16} />
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Phone size={16} />
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              City
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Building size={16} />
              </span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Noida, Delhi, Mumbai"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* Save Profile Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : profileExists ? "Update Profile Details" : "Create Profile"}
          </button>
        </form>

        {/* APP PERMISSIONS SECTION */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Lock size={16} className="text-emerald-600" /> App Permissions
          </h3>

          <div className="space-y-3">
            
            {/* Camera Permission Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="flex items-start gap-3 pr-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Camera size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Camera Access
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Allows capturing photos of injured stray animals or lost pets directly within StrayAid.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleCameraPermission}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  cameraPermission === "granted" ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    cameraPermission === "granted" ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Location Permission Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="flex items-start gap-3 pr-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Location Access
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Allows StrayAid to detect nearby stray reports and lost & found pet sightings in your area.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleLocationPermission}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  locationPermission === "granted" ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    locationPermission === "granted" ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

          </div>
        </div>

        {/* GUARDIAN MODE SETTINGS */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
              <ShieldAlert size={16} className="text-emerald-600" /> Guardian Mode Settings
            </h3>
            {isGuardian && (
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                guardianAvailable
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                Guardian Mode: {guardianAvailable ? "ON" : "OFF"}
              </span>
            )}
          </div>

          {/* Educational Description (only when not registered yet) */}
          {!isGuardian && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <Sparkles size={16} className="text-emerald-600 shrink-0" />
                What is Guardian Mode?
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                StrayAid Guardians are local animal heroes and volunteers willing to receive <strong>real-time notifications</strong> about nearby rescue dispatches. Enabling Guardian Mode registers you to help when you are available. You are never obligated to accept every rescue!
              </p>
            </div>
          )}

          {/* Guardian Mode Activation Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 bg-white shadow-xs">
            <div className="pr-4">
              <h4 className="text-xs font-bold text-slate-900">
                {isGuardian ? "Active Status" : "Become a Guardian"}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isGuardian
                  ? guardianAvailable
                    ? "Guardian Mode is ON. You are willing to receive local rescue alerts."
                    : "Guardian Mode is OFF. You will not receive local rescue alerts."
                  : "Register as a volunteer willing to help local strays."}
              </p>
            </div>

            <button
              type="button"
              disabled={guardianLoading}
              onClick={handleToggleGuardianStatus}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                (isGuardian ? guardianAvailable : isGuardian) ? "bg-emerald-600" : "bg-slate-300"
              } ${guardianLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  (isGuardian ? guardianAvailable : isGuardian) ? "left-5.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Rescue Notification Permission Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
            <div className="flex items-start gap-3 pr-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Bell size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Nearby Rescue Notifications
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Do you want to get notified every time any rescue happens nearby you?
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNotifyNearbyRescues((prev) => !prev)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                notifyNearbyRescues ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  notifyNearbyRescues ? "left-5.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

        </div>

        {/* Sign Out Section */}
        <div className="pt-4 border-t border-slate-150 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-xl border border-rose-200 bg-rose-50/50 py-3 text-sm font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center space-y-6 animate-scaleIn">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-3xl">
              🐾
            </div>
            
            <h2 className="text-2xl font-extrabold text-slate-900 font-sans">
              You're now a Guardian
            </h2>
            
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              You've chosen to help animals in need around you. When a rescue request is reported nearby, we'll let you know. You can decide whether you're available to help.
            </p>
            
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-sm shadow-md shadow-emerald-100 border border-emerald-600 cursor-pointer font-sans"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}