import { supabase } from "../../lib/supabase";

interface GuardianInput {
  user_id: string;
  name: string;
  phone: string;
  city: string;
  available: boolean;
  profile_image?: string | null;
  bio?: string | null;
  experience?: string | null;
}

export async function createGuardian(
  guardian: GuardianInput
) {
  const { data, error } = await supabase
    .from("guardians")
    .insert([
      {
        ...guardian,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}