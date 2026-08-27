import { supabase } from "../../lib/supabase";
import type {
  CreateGuardianData,
  Guardian,
} from "../../types/guardian";

export async function createGuardian(
  data: CreateGuardianData
): Promise<Guardian> {
  const {
    data: guardian,
    error,
  } = await supabase
    .from("guardians")
    .insert({
      user_id: data.user_id,

      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,

      available: data.available ?? true,

      bio: data.bio ?? null,
      experience: data.experience ?? null,
      is_verified: true,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Failed to create guardian:",
      error
    );

    throw error;
  }

  return guardian;
}