import { supabase } from "../../lib/supabase";

export async function getReportById(id: string) {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}