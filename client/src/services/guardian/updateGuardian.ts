import { supabase } from "../../lib/supabase";

interface GuardianUpdate {
  name: string;
  phone: string;
  city: string;
  available: boolean;
  profile_image?: string | null;
  bio?: string | null;
  experience?: string | null;
}

export async function updateGuardian(
  userId: string,
  guardian: GuardianUpdate
) {
  const { data, error } = await supabase
    .from("guardians")
    .update({
      ...guardian,
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