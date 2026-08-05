import { supabase } from "../../lib/supabase";

export async function getRecentReports() {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;

  return data;
}