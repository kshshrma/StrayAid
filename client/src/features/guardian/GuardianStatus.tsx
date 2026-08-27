import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { updateGuardian } from "../../services/guardian/updateGuardian";

interface GuardianStatusProps {
  guardian: {
    id: string;
    user_id: string;
    latitude: number | null;
    longitude: number | null;
    is_verified: boolean;
    available: boolean;
    total_rescues: number;
    bio: string | null;
    experience: string | null;
  } | null;

  onGuardianUpdated?: (guardian: any) => void;
}

export default function GuardianStatus({
  guardian,
  onGuardianUpdated,
}: GuardianStatusProps) {
  const navigate = useNavigate();

  const [updating, setUpdating] = useState(false);
  const [locationLoading, setLocationLoading] =
    useState(false);

  if (!guardian) {
    return (
      <div className="mb-5 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-2xl">
            🛟
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              Guardian Network
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Help injured and vulnerable animals in your area.
            </p>

            <button
              onClick={() => navigate("/guardian")}
              className="mt-4 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Become a Guardian
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function toggleAvailability() {
    try {
      setUpdating(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        alert("Please login again.");
        navigate("/login");
        return;
      }

      if (!guardian) {
        return;
      }

      const updatedGuardian = await updateGuardian(
        session.user.id,
        {
          available: !guardian.available,
        }
      );

      onGuardianUpdated?.(updatedGuardian);
    } catch (error: any) {
      console.error(
        "Failed to update Guardian availability:",
        error
      );

      alert(
        error?.message ||
          "Unable to update availability."
      );
    } finally {
      setUpdating(false);
    }
  }

  function updateLocation() {
    if (!navigator.geolocation) {
      alert(
        "Location is not supported by your browser."
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            alert("Please login again.");
            navigate("/login");
            return;
          }

          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const updatedGuardian =
            await updateGuardian(
              session.user.id,
              {
                latitude,
                longitude,
                last_active:
                  new Date().toISOString(),
              }
            );

          onGuardianUpdated?.(
            updatedGuardian
          );

          alert(
            "Guardian location updated successfully!"
          );
        } catch (error: any) {
          console.error(
            "Failed to update location:",
            error
          );

          alert(
            error?.message ||
              "Unable to update location."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error(
          "Location error:",
          error
        );

        setLocationLoading(false);

        alert(
          "Unable to get your location. Please allow location access."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  return (
    <div className="mb-5 rounded-3xl bg-white p-5 shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
          🛟
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Guardian
          </h2>

          <p className="text-sm text-gray-500">
            Your Guardian profile
          </p>
        </div>
      </div>

      {/* Status cards */}
      <div className="mt-5 grid grid-cols-2 gap-3">

        {/* Guardian Mode */}
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Guardian Mode
          </p>

          <p
            className={`mt-1 text-sm font-extrabold ${
              guardian.available
                ? "text-green-600"
                : "text-gray-500"
            }`}
          >
            {guardian.available
              ? "ON"
              : "OFF"}
          </p>
        </div>

        {/* Rescues */}
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Rescues Completed
          </p>

          <p className="mt-1 text-sm font-extrabold text-gray-900">
            {guardian.total_rescues}
          </p>
        </div>

        {/* Experience */}
        <div className="rounded-2xl bg-gray-50 p-4 col-span-2">
          <p className="text-xs text-gray-500">
            Rescue Experience
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-900 leading-relaxed">
            {guardian.experience || "No rescue experience listed"}
          </p>
        </div>
      </div>

      {/* Guardian Mode Control */}
      <div className="mt-5 rounded-2xl border border-gray-100 p-4 bg-slate-50/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-1.5 font-sans text-sm">
              🐾 Guardian Mode
            </h3>
            <p className="mt-1 text-xs text-gray-500 leading-normal font-sans">
              Being a Guardian means you are willing to help animals in need around you. You can turn this off if you are temporarily unavailable.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0">
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border font-sans ${
              guardian.available 
                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              {guardian.available ? "ON" : "OFF"}
            </span>
            
            <button
              type="button"
              onClick={toggleAvailability}
              disabled={updating}
              className={`text-xs font-bold px-3 py-2 rounded-xl border transition cursor-pointer font-sans shadow-sm ${
                guardian.available
                  ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              } ${updating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {updating 
                ? "Updating..." 
                : guardian.available 
                  ? "Turn Off Guardian Mode" 
                  : "Turn On Guardian Mode"}
            </button>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="mt-5 rounded-2xl border border-gray-100 p-4">

        <div>
          <h3 className="font-semibold text-gray-800">
            📍 Guardian Location
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Keep your location updated so StrayAid
            can find nearby rescue requests.
          </p>
        </div>

        {guardian.latitude !== null &&
          guardian.longitude !== null && (
            <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
              <p>
                Latitude: {guardian.latitude}
              </p>

              <p>
                Longitude: {guardian.longitude}
              </p>
            </div>
          )}

        <button
          type="button"
          onClick={updateLocation}
          disabled={locationLoading}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {locationLoading
            ? "Updating Location..."
            : "📍 Update My Location"}
        </button>
      </div>

    </div>
  );
}