import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface ClaimedRescueItem {
  assignmentId: string;
  assignmentStatus: string;
  distanceKm?: number | null;
  report: any;
  acceptedAt?: string | null;
  completedAt?: string | null;
}

export async function getMyAcceptedRescues(): Promise<{
  rescues: ClaimedRescueItem[];
  livesSavedCount: number;
  activeCount: number;
}> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return { rescues: [], livesSavedCount: 0, activeCount: 0 };
  }

  // 1. Try backend API first
  try {
    const response = await fetch(`${API_URL}/api/rescue/my-rescues`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.rescues)) {
        return {
          rescues: result.rescues,
          livesSavedCount: result.livesSavedCount || 0,
          activeCount: result.activeCount || 0,
        };
      }
    }
  } catch (apiErr) {
    console.warn("[MyAcceptedRescues] Backend API call failed, falling back to direct query:", apiErr);
  }

  // 2. Direct Supabase query fallback strictly for the authenticated Guardian
  try {
    const { data: guardian } = await supabase
      .from("guardians")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!guardian) {
      return { rescues: [], livesSavedCount: 0, activeCount: 0 };
    }

    const { data: assignments } = await supabase
      .from("rescue_assignments")
      .select("id, report_id, status, distance_km, created_at, updated_at, responded_at")
      .eq("guardian_id", guardian.id)
      .in("status", ["accepted", "enroute", "rescued", "completed"])
      .order("updated_at", { ascending: false });

    if (!assignments || assignments.length === 0) {
      return { rescues: [], livesSavedCount: 0, activeCount: 0 };
    }

    const reportIds = Array.from(new Set(assignments.map((a) => a.report_id).filter(Boolean)));
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .in("id", reportIds);

    const reportMap = new Map((reports || []).map((r) => [r.id, r]));

    const combined: ClaimedRescueItem[] = assignments.map((assign) => {
      const rep = reportMap.get(assign.report_id);
      return {
        assignmentId: assign.id,
        assignmentStatus: assign.status,
        distanceKm: assign.distance_km,
        report: rep || null,
        acceptedAt: rep?.accepted_at || assign.responded_at,
        completedAt: rep?.completed_at || (assign.status === "completed" ? assign.updated_at : null),
      };
    });

    const completedDistinct = new Set(
      assignments.filter((a) => a.status === "completed").map((a) => a.report_id)
    ).size;
    const activeCount = assignments.filter((a) => ["accepted", "enroute", "rescued"].includes(a.status)).length;

    return {
      rescues: combined,
      livesSavedCount: completedDistinct,
      activeCount,
    };
  } catch (err) {
    console.error("[MyAcceptedRescues] Fallback failed:", err);
    return { rescues: [], livesSavedCount: 0, activeCount: 0 };
  }
}
