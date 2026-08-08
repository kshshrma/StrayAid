import { supabase } from "../../lib/supabase";

interface CreateAssignmentInput {
  reportId: string;
  guardianId: string;
  distanceKm?: number;
  dispatchScore?: number;
  expiresAt?: string;
}

export async function createAssignment({
  reportId,
  guardianId,
  distanceKm,
  dispatchScore,
  expiresAt,
}: CreateAssignmentInput) {
  const { data, error } = await supabase
    .from("rescue_assignments")
    .insert({
      report_id: reportId,
      guardian_id: guardianId,
      status: "pending",
      distance_km: distanceKm ?? null,
      dispatch_score: dispatchScore ?? null,
      expires_at: expiresAt ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}