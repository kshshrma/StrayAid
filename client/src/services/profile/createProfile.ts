import { supabase } from "../../lib/supabase";

interface ProfileInput {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  avatar_url?: string | null;
  role?: string;
}

export async function createProfile(profile: ProfileInput) {
  const { data, error } = await supabase
    .from("profiles")
    .insert([
      {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        city: profile.city,
        avatar_url: profile.avatar_url ?? null,
        role: profile.role ?? "citizen",
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}