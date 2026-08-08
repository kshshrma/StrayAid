import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { getGuardian } from "../services/guardian/getGuardian";

import ProfileForm from "../features/profile/ProfileForm";
import GuardianStatus from "../features/guardian/GuardianStatus";

interface Guardian {
  id: string;
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  available: boolean;
  created_at: string;
  updated_at: string;
  total_rescues: number;
  bio: string | null;
  experience: string | null;
  last_active: string | null;
  is_verified: boolean;
}

export default function Profile() {
  const [guardian, setGuardian] =
    useState<Guardian | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGuardian() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setGuardian(null);
          return;
        }

        const data = await getGuardian(
          session.user.id
        );

        setGuardian(data);
      } catch (error) {
        console.error(
          "Failed to load Guardian:",
          error
        );

        setGuardian(null);
      } finally {
        setLoading(false);
      }
    }

    loadGuardian();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-5 pb-28">

      {/* Guardian section */}
      {!loading && (
        <GuardianStatus guardian={guardian} />
      )}

      {/* Existing profile */}
      <ProfileForm />

    </div>
  );
}