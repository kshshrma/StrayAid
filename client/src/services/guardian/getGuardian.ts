import { supabase } from "../../lib/supabase";

export async function getGuardian(userId: string) {
  const { data, error } = await supabase
    .from("guardians")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}