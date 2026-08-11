import { supabase } from "../../lib/supabase";

interface ProfileUpdate {
  full_name: string;
  phone: string;
  city: string;
  avatar_url?: string | null;
}

export async function updateProfile(
  userId: string,
  profile: ProfileUpdate
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: profile.full_name,
      phone: profile.phone,
      city: profile.city,
      avatar_url: profile.avatar_url ?? null,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}