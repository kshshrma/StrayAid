import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { getGuardian } from "../services/guardian/getGuardian";

import GuardianForm from "../features/guardian/GuardianForm";
import GuardianStatus from "../features/guardian/GuardianStatus";
import GuardianRescueAssignments from "../features/guardian/GuardianRescueAssignments";

export default function Guardian() {
  const [guardian, setGuardian] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadGuardian() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setGuardian(null);
        return;
      }

      const data = await getGuardian(session.user.id);

      setGuardian(data);
    } catch (error) {
      console.error(
        "Failed to load Guardian:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuardian();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-5 pb-28">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Loading Guardian profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 pb-28">
      <div className="mx-auto w-full max-w-xl space-y-5">

        {/* Guardian status/profile */}
        <GuardianStatus
          guardian={guardian}
          onGuardianUpdated={setGuardian}
        />

        {/* Guardian registration */}
        {!guardian && <GuardianForm />}

        {/* Rescue assignments */}
        {guardian && guardian.is_verified && (
          <GuardianRescueAssignments />
        )}

      </div>
    </div>
  );
}