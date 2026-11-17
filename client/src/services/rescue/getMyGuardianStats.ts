import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface GuardianIndividualStats {
  guardianId: string;
  totalRescues: number;
  livesSaved: number;
  activeAssignments: number;
  pendingAssignments: number;
  available: boolean;
  isVerified: boolean;
  guardianLevel: string;
}

export async function getMyGuardianStats(): Promise<GuardianIndividualStats | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return null;
  }

  // 1. Try backend API first
  try {
    const response = await fetch(`${API_URL}/api/rescue/my-stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.stats) {
        return result.stats;
      }
    }
  } catch (apiErr) {
    console.warn("[GuardianStats] Backend endpoint unavailable, falling back to direct query:", apiErr);
  }

  // 2. Resilient fallback query via Supabase
  try {
    const { data: guardian } = await supabase
      .from("guardians")
      .select("id, available, is_verified, total_rescues")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!guardian) {
      return null;
    }

    const { data: assignments } = await supabase
      .from("rescue_assignments")
      .select("report_id, status")
      .eq("guardian_id", guardian.id);

    const all = assignments || [];
    const completedAssignments = all.filter((a) => a.status === "completed");
    const activeAssignments = all.filter((a) => ["accepted", "enroute", "rescued"].includes(a.status));
    const pendingAssignments = all.filter((a) => a.status === "pending");

    const uniqueCompletedReports = new Set(completedAssignments.map((a) => a.report_id));
    const livesSaved = uniqueCompletedReports.size;

    let guardianLevel = "Rookie Guardian";
    if (livesSaved >= 10) {
      guardianLevel = "Master Guardian";
    } else if (livesSaved >= 5) {
      guardianLevel = "Senior Guardian";
    } else if (livesSaved >= 1) {
      guardianLevel = "Junior Guardian";
    }

    return {
      guardianId: guardian.id,
      totalRescues: livesSaved,
      livesSaved,
      activeAssignments: activeAssignments.length,
      pendingAssignments: pendingAssignments.length,
      available: guardian.available,
      isVerified: guardian.is_verified,
      guardianLevel,
    };
  } catch (err) {
    console.error("[GuardianStats] Fallback calculation failed:", err);
    return null;
  }
}
