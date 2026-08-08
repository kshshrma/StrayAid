import { supabase } from "../../lib/supabase";

export async function getGuardian(
  userId: string
) {
  const { data, error } = await supabase
    .from("guardians")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}