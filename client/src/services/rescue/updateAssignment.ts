import { supabase } from "../../lib/supabase";

type AssignmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled"
  | "completed";

interface UpdateAssignmentInput {
  status?: AssignmentStatus;
  respondedAt?: string | null;
}

export async function updateAssignment(
  assignmentId: string,
  updates: UpdateAssignmentInput
) {
  const updateData: {
    status?: AssignmentStatus;
    responded_at?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }

  if (updates.respondedAt !== undefined) {
    updateData.responded_at =
      updates.respondedAt;
  }

  const { data, error } = await supabase
    .from("rescue_assignments")
    .update(updateData)
    .eq("id", assignmentId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}