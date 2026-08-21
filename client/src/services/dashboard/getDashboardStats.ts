import { supabase } from "../../lib/supabase";
import { calculateDistance } from "../../utils/distance";

export interface DashboardStats {
  activeRescues: number;
  nearbyReports: number;
  guardiansOnline: number;
  animalsHelped: number;
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

  // Immediate Rescue Requests: Pending cases with Critical severity OR Emergency priority
  const activeRescues = reports.filter(r => {
    const s = (r.status || "").toLowerCase();
    if (s !== "pending") return false;

    const sev = (r.severity || "").toLowerCase();
    const prio = (r.priority || "").toLowerCase();
    if (sev !== "critical" && prio !== "emergency") return false;

    // Filter within 20 km radius if user coordinates are active
    if (
      userLat !== undefined &&
      userLat !== null &&
      userLon !== undefined &&
      userLon !== null &&
      r.latitude !== null &&
      r.longitude !== null
    ) {
      const dist = calculateDistance(userLat, userLon, r.latitude, r.longitude);
      return dist <= 20;
    }

    return true;
  }).length;

  // Nearby Reports: All Pending cases (within 20 km radius if user coordinates are active)
  const nearbyReports = reports.filter(r => {
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
      return dist <= 20;
    }

    return true;
  }).length;

  const animalsHelped = reports.filter(r => {
    const s = (r.status || "").toLowerCase();
    return s === "accepted" || s === "enroute" || s === "rescued" || s === "completed";
  }).length;

  return {
    activeRescues,
    nearbyReports,
    guardiansOnline: guardiansCount || 0,
    animalsHelped,
  };
}