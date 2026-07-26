import { supabase } from "../../lib/supabase";

export async function acceptReport(id: string) {
  const { data, error } = await supabase
    .from("reports")
    .update({
      status: "Accepted",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}