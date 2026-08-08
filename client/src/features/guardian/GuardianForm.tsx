import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { createGuardian } from "../../services/guardian/createGuardian";

export default function GuardianForm() {
  const navigate = useNavigate();

  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");

  const [available, setAvailable] = useState(true);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] =
    useState(false);

  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  async function getLocation() {
    if (!navigator.geolocation) {
      alert(
        "Location is not supported by your browser."
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        setLocationLoading(false);
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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setLoading(true);

      // Check login session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user) {
        alert("Please login first.");
        navigate("/login");
        return;
      }

      const userId = session.user.id;

      // Get location before creating Guardian
      if (
        latitude === null ||
        longitude === null
      ) {
        alert(
          "Please get your location before becoming a Guardian."
        );

        await getLocation();

        return;
      }

      await createGuardian({
        user_id: userId,

        latitude,
        longitude,

        available,

        bio: bio.trim() || null,
        experience:
          experience.trim() || null,
      });

      alert(
        "Guardian application submitted successfully!"
      );

      navigate("/profile");
    } catch (error: any) {
      console.error(
        "Guardian registration error:",
        error
      );

      if (
        error?.code === "23505"
      ) {
        alert(
          "You are already registered as a Guardian."
        );
      } else {
        alert(
          error?.message ||
            "Failed to create Guardian profile."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-3xl bg-white p-6 shadow-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
            🛟
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Become a Guardian
          </h1>

          <p className="mt-2 text-gray-500">
            Help injured and vulnerable animals
            in your area.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* Bio */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              About You
            </label>

            <textarea
              value={bio}
              onChange={(event) =>
                setBio(event.target.value)
              }
              placeholder="Tell us a little about yourself..."
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Experience */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Rescue Experience
            </label>

            <textarea
              value={experience}
              onChange={(event) =>
                setExperience(
                  event.target.value
                )
              }
              placeholder="Do you have any previous animal rescue experience?"
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Location */}
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-4">

              <div>
                <h3 className="font-semibold text-gray-800">
                  📍 Your Location
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Your location helps us find
                  nearby rescue requests.
                </p>
              </div>

              <button
                type="button"
                onClick={getLocation}
                disabled={locationLoading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {locationLoading
                  ? "Getting..."
                  : latitude !== null
                  ? "Location Added"
                  : "Get Location"}
              </button>
            </div>

            {latitude !== null &&
              longitude !== null && (
                <div className="mt-3 rounded-xl bg-white p-3 text-xs text-gray-500">
                  <p>
                    Latitude: {latitude}
                  </p>

                  <p>
                    Longitude: {longitude}
                  </p>
                </div>
              )}
          </div>

          {/* Availability */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 p-4">

            <div>
              <h3 className="font-semibold text-gray-800">
                Available for rescues
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Allow StrayAid to send rescue
                requests to you.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAvailable(!available)
              }
              className={`relative h-7 w-12 rounded-full transition ${
                available
                  ? "bg-green-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  available
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Verification notice */}
          <div className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
            <strong>
              Verification required
            </strong>

            <p className="mt-1">
              Your Guardian profile will initially
              be marked as unverified. Guardian
              verification will be handled separately.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading
              ? "Submitting..."
              : "🛟 Become a Guardian"}
          </button>

        </form>
      </div>
    </div>
  );
}