import { supabase } from "../../lib/supabase";

export interface DashboardStats {
  activeRescues: number;
  nearbyReports: number;
  guardiansOnline: number;
  animalsHelped: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from("reports")
    .select("status");

  if (error) throw error;

  const reports = data ?? [];

  return {
    activeRescues: reports.filter(
      r => r.status === "Pending"
    ).length,

    nearbyReports: reports.length,

    // Placeholder until Guardian system is built
    guardiansOnline: 0,

    animalsHelped: reports.filter(
      r => r.status === "Accepted"
    ).length,
  };
}