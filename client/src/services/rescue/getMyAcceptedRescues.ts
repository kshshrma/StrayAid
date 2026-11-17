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

    // 1. Query reports directly assigned to this guardian
    const { data: assignedReports } = await supabase
      .from("reports")
      .select("*")
      .eq("assigned_guardian_id", guardian.id)
      .in("status", ["accepted", "enroute", "rescued", "completed", "Accepted", "Enroute", "Rescued", "Completed"]);

    // 2. Query assignments for this guardian
    const { data: assignments } = await supabase
      .from("rescue_assignments")
      .select("id, report_id, status, distance_km, created_at, updated_at, responded_at")
      .eq("guardian_id", guardian.id)
      .in("status", ["accepted", "enroute", "rescued", "completed", "Accepted", "Enroute", "Rescued", "Completed"])
      .order("updated_at", { ascending: false });

    const reportMap = new Map<string, any>();
    (assignedReports || []).forEach((r) => reportMap.set(r.id, r));

    const assignmentMap = new Map<string, any>();
    (assignments || []).forEach((a) => {
      if (a.report_id) assignmentMap.set(a.report_id, a);
    });

    const missingIds = (assignments || [])
      .map((a) => a.report_id)
      .filter((id) => id && !reportMap.has(id));

    if (missingIds.length > 0) {
      const { data: extraReports } = await supabase
        .from("reports")
        .select("*")
        .in("id", missingIds);
      (extraReports || []).forEach((r) => reportMap.set(r.id, r));
    }

    const allReportIds = Array.from(reportMap.keys());
    if (allReportIds.length === 0) {
      return { rescues: [], livesSavedCount: 0, activeCount: 0 };
    }

    const combined: ClaimedRescueItem[] = allReportIds.map((repId) => {
      const rep = reportMap.get(repId);
      const assign = assignmentMap.get(repId);
      const rawStatus = (assign?.status || rep?.status || "accepted").toLowerCase();
      return {
        assignmentId: assign?.id || `rep-${rep.id}`,
        assignmentStatus: rawStatus,
        distanceKm: assign?.distance_km ?? null,
        report: rep,
        acceptedAt: rep?.accepted_at || assign?.responded_at || rep?.created_at,
        completedAt: rep?.completed_at || (rawStatus === "completed" ? assign?.updated_at || rep?.updated_at : null),
      };
    });

    combined.sort((a, b) => {
      const timeA = new Date(a.acceptedAt || a.report?.created_at || 0).getTime();
      const timeB = new Date(b.acceptedAt || b.report?.created_at || 0).getTime();
      return timeB - timeA;
    });

    const activeCount = combined.filter((c) =>
      ["accepted", "enroute", "rescued"].includes(c.assignmentStatus)
    ).length;

    return {
      rescues: combined,
      livesSavedCount: combined.length,
      activeCount,
    };
  } catch (err) {
    console.error("[MyAcceptedRescues] Fallback failed:", err);
    return { rescues: [], livesSavedCount: 0, activeCount: 0 };
  }
}
