import { supabase } from "../../lib/supabase";
import { calculateDistance } from "../../utils/distance";

export interface DashboardStats {
  activeRescues: number;
  nearbyReports: number;
  guardiansOnline: number;
  animalsHelped: number;
  totalReports: number;
  isGuardian: boolean;
  guardianLevel: string;
}

export async function getDashboardStats(
  userLat?: number | null,
  userLon?: number | null
): Promise<DashboardStats> {
  const { data: reportsData, error: reportsError } = await supabase
    .from("reports")
    .select("status, latitude, longitude, severity, priority");

  if (reportsError) throw reportsError;

  const { count: guardiansCount, error: guardiansError } = await supabase
    .from("guardians")
    .select("id", { count: "exact", head: true })
    .eq("available", true)
    .eq("is_verified", true);

  if (guardiansError) throw guardiansError;

  const reports = reportsData ?? [];

  // Check if current user is an authenticated Guardian
  let personalLivesSaved: number | null = null;
  let isGuardian = false;
  let guardianLevel = "Guardian";

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: guardian } = await supabase
        .from("guardians")
        .select("id, total_rescues")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (guardian) {
        isGuardian = true;

        // Query both reports assigned to this guardian AND rescue assignments
        const { data: assignedReports } = await supabase
          .from("reports")
          .select("id")
          .eq("assigned_guardian_id", guardian.id)
          .in("status", ["accepted", "enroute", "rescued", "completed", "Accepted", "Enroute", "Rescued", "Completed"]);

        const { data: assignments } = await supabase
          .from("rescue_assignments")
          .select("report_id")
          .eq("guardian_id", guardian.id)
          .in("status", ["accepted", "enroute", "rescued", "completed", "Accepted", "Enroute", "Rescued", "Completed"]);

        const distinctReports = new Set([
          ...(assignedReports || []).map((r) => r.id),
          ...(assignments || []).map((a) => a.report_id),
        ].filter(Boolean));

        personalLivesSaved = distinctReports.size;

        if (personalLivesSaved >= 20) guardianLevel = "Master Guardian";
        else if (personalLivesSaved >= 10) guardianLevel = "Senior Guardian";
        else if (personalLivesSaved >= 5) guardianLevel = "Lead Rescuer";
        else if (personalLivesSaved >= 1) guardianLevel = "Active Guardian";
        else guardianLevel = "Apprentice Rescuer";
      }
    }
  } catch (err) {
    console.warn("[getDashboardStats] Failed to fetch personal guardian stats:", err);
  }

  // Immediate Rescue Requests: Pending cases with Critical severity OR Emergency priority (within 10 km geofenced radius if coordinates are loaded)
  const activeRescues = reports.filter((r) => {
    const s = (r.status || "").toLowerCase();
    if (s !== "pending") return false;

    const sev = (r.severity || "").toLowerCase();
    const prio = (r.priority || "").toLowerCase();
    if (sev !== "critical" && prio !== "emergency") return false;

    // Filter within 10 km radius if user coordinates are active
    if (
      userLat !== undefined &&
      userLat !== null &&
      userLon !== undefined &&
      userLon !== null &&
      r.latitude !== null &&
      r.longitude !== null
    ) {
      const dist = calculateDistance(userLat, userLon, r.latitude, r.longitude);
      return dist <= 10;
    }

    return true;
  }).length;

  // Nearby Reports: All Pending cases (within 10 km radius if user coordinates are active)
  const nearbyReports = reports.filter((r) => {
    const s = (r.status || "").toLowerCase();
    if (s !== "pending") return false;

    if (
      userLat !== undefined &&
      userLat !== null &&
      userLon !== undefined &&
      userLon !== null &&
      r.latitude !== null &&
      r.longitude !== null
    ) {
      const dist = calculateDistance(userLat, userLon, r.latitude, r.longitude);
      return dist <= 10;
    }

    return true;
  }).length;

  // Lives Saved calculation:
  // If authenticated Guardian: strictly their personal accepted & saved rescues.
  // If general citizen/guest: community accepted & completed rescues.
  const communityCompletedCount = reports.filter((r) => {
    const s = (r.status || "").toLowerCase();
    return s === "accepted" || s === "enroute" || s === "rescued" || s === "completed";
  }).length;

  const animalsHelped = isGuardian && personalLivesSaved !== null
    ? personalLivesSaved
    : communityCompletedCount;

  return {
    activeRescues,
    nearbyReports,
    guardiansOnline: guardiansCount || 0,
    animalsHelped,
    totalReports: reports.length,
    isGuardian,
    guardianLevel,
  };
}