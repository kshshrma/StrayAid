import { supabase } from "../../lib/supabase";

interface GuardianUpdate {
  available?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  bio?: string | null;
  experience?: string | null;
  last_active?: string | null;
}

export async function updateGuardian(
  userId: string,
  updates: GuardianUpdate
) {
  const { data, error } = await supabase
    .from("guardians")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}