import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { createProfile } from "../../services/profile/createProfile";
import { getProfile } from "../../services/profile/getProfile";
import { updateProfile } from "../../services/profile/updateProfile";

export default function ProfileForm() {
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error("You are not logged in.");
        }

        setUserId(user.id);

        const profile = await getProfile(user.id);

        if (profile) {
          setProfileExists(true);

          setFullName(profile.full_name ?? "");
          setPhone(profile.phone ?? "");
          setCity(profile.city ?? "");
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!userId) {
      alert("User not found. Please login again.");
      return;
    }

    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (!phone.trim()) {
      alert("Please enter your phone number.");
      return;
    }

    if (!city.trim()) {
      alert("Please enter your city.");
      return;
    }

    try {
      setSaving(true);

      if (profileExists) {
        await updateProfile(userId, {
          full_name: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
        });

        alert("Profile updated successfully!");
      } else {
        await createProfile({
          id: userId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          role: "citizen",
        });

        setProfileExists(true);

        alert("Profile created successfully!");
      }
    } catch (error: any) {
      console.error("Profile save error:", error);

      alert(
        error?.message ||
          "Failed to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">
          Loading profile...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-3xl bg-white p-6 shadow-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
            👤
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            My Profile
          </h1>

          <p className="mt-2 text-gray-500">
            Manage your personal information
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* Full Name */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder="Enter your full name"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Phone Number
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="Enter your phone number"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* City */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              City
            </label>

            <input
              type="text"
              value={city}
              onChange={(event) =>
                setCity(event.target.value)
              }
              placeholder="Enter your city"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Account Type
            </label>

            <div className="rounded-xl bg-gray-100 px-4 py-3 text-gray-600">
              Citizen
            </div>

            <p className="mt-2 text-xs text-gray-400">
              Guardian access will be enabled separately.
            </p>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {saving
              ? "Saving..."
              : profileExists
              ? "Update Profile"
              : "Create Profile"}
          </button>

        </form>
      </div>
    </div>
  );
}