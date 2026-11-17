import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function acceptReport(id: string) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Please sign in to accept this rescue assignment.");
  }

  // 1. Try backend authenticated endpoint first
  try {
    const res = await fetch(`${API_URL}/api/reports/${id}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.report) {
        return data.report;
      }
    }
  } catch (backendErr) {
    console.warn("Backend accept endpoint error, falling back to direct Supabase update:", backendErr);
  }

  // 2. Direct Supabase Fallback
  // Find or create Guardian record for this user
  let guardianId: string | null = null;
  const { data: guardian } = await supabase
    .from("guardians")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (guardian) {
    guardianId = guardian.id;
  } else {
    const { data: newGuardian } = await supabase
      .from("guardians")
      .insert({
        user_id: session.user.id,
        available: true,
        is_verified: true,
      })
      .select("id")
      .single();

    if (newGuardian) {
      guardianId = newGuardian.id;
    }
  }

  const nowIso = new Date().toISOString();
  const updatePayload: any = {
    status: "accepted",
    accepted_at: nowIso,
  };
  if (guardianId) {
    updatePayload.assigned_guardian_id = guardianId;
  }

  const { data, error } = await supabase
    .from("reports")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Also record rescue assignment if guardian profile exists
  if (guardianId) {
    try {
      const { data: existingAssignment } = await supabase
        .from("rescue_assignments")
        .select("id")
        .eq("report_id", id)
        .eq("guardian_id", guardianId)
        .maybeSingle();

      if (existingAssignment) {
        await supabase
          .from("rescue_assignments")
          .update({
            status: "accepted",
            responded_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", existingAssignment.id);
      } else {
        await supabase
          .from("rescue_assignments")
          .insert({
            report_id: id,
            guardian_id: guardianId,
            status: "accepted",
            responded_at: nowIso,
            updated_at: nowIso,
          });
      }
    } catch (assignErr) {
      console.warn("Could not insert rescue assignment:", assignErr);
    }
  }

  return data;
}
