import { supabase } from "../../lib/supabase";

export interface DashboardStats {
  activeRescues: number;
  nearbyReports: number;
  guardiansOnline: number;
  animalsHelped: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: reportsData, error: reportsError } = await supabase
    .from("reports")
    .select("status");

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
    return s === "pending";
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