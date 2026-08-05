import { supabase } from "../../lib/supabase";

export async function getDashboardStats() {
  const { data, error } = await supabase
    .from("reports")
    .select("status,severity");

  if (error) throw error;

  const reports = data ?? [];

  return {
    total: reports.length,

    pending: reports.filter(
      r => r.status === "Pending"
    ).length,

    accepted: reports.filter(
      r => r.status === "Accepted"
    ).length,

    critical: reports.filter(
      r => r.severity === "Critical"
    ).length,

    high: reports.filter(
      r => r.severity === "High"
    ).length,
  };
}