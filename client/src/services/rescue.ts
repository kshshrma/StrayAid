import { supabase } from "./supabase";

interface CreateAssignmentInput {
  reportId: string;
  guardianId: string;
  distanceKm?: number;
  dispatchScore?: number;
  expiresAt?: string;
}

export async function createRescueAssignment(
  input: CreateAssignmentInput
) {
  const {
    reportId,
    guardianId,
    distanceKm,
    dispatchScore,
    expiresAt,
  } = input;

  // Check that the report exists
  const { data: report, error: reportError } =
    await supabase
      .from("reports")
      .select("id")
      .eq("id", reportId)
      .single();

  if (reportError || !report) {
    throw new Error("Report not found");
  }

  // Check that the Guardian exists
  const {
    data: guardian,
    error: guardianError,
  } = await supabase
    .from("guardians")
    .select(
      "id, available, is_verified"
    )
    .eq("id", guardianId)
    .single();

  if (guardianError || !guardian) {
    throw new Error("Guardian not found");
  }

  // Guardian must be available
  if (!guardian.available) {
    throw new Error(
      "Guardian is not currently available"
    );
  }

  // Guardian must be verified
  if (!guardian.is_verified) {
    throw new Error(
      "Guardian is not verified"
    );
  }

  // Create assignment
  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("rescue_assignments")
    .insert({
      report_id: reportId,
      guardian_id: guardianId,
      status: "pending",
      distance_km:
        distanceKm ?? null,
      dispatch_score:
        dispatchScore ?? null,
      expires_at:
        expiresAt ?? null,
    })
    .select()
    .single();

  if (assignmentError) {
    throw assignmentError;
  }

  return assignment;
}