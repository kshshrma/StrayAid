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
    .select("status, latitude, longitude");

  if (reportsError) throw reportsError;

  const { count: guardiansCount, error: guardiansError } = await supabase
    .from("guardians")
    .select("id", { count: "exact", head: true })
    .eq("available", true)
    .eq("is_verified", true);

  if (guardiansError) throw guardiansError;

  const reports = reportsData ?? [];

  const activeRescues = reports.filter(r => {
    const s = (r.status || "").toLowerCase();
    return s === "accepted" || s === "enroute" || s === "rescued";
  }).length;

  const nearbyReports = reports.filter(r => {
    const s = (r.status || "").toLowerCase();
    if (s !== "pending") return false;

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

    return true; // fallback to count all pending if location not loaded
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