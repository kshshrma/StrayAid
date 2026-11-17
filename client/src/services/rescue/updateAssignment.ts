import { supabase } from "../../lib/supabase";

type AssignmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "enroute"
  | "rescued"
  | "expired"
  | "cancelled"
  | "completed";

interface UpdateAssignmentInput {
  status: AssignmentStatus;
}

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface UpdateAssignmentResult {
  assignment: any;
  totalRescues?: number;
  livesSaved?: number;
}

export async function updateAssignment(
  assignmentId: string,
  updates: UpdateAssignmentInput
): Promise<any> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error("User is not authenticated");
  }

  const response = await fetch(
    `${API_URL}/api/rescue/assignments/${assignmentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        status: updates.status,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to update rescue assignment"
    );
  }

  // Attach livesSaved and totalRescues to the assignment object for convenience
  const returnedAssignment = result.assignment || {};
  if (result.totalRescues !== undefined) {
    returnedAssignment.totalRescues = result.totalRescues;
  }
  if (result.livesSaved !== undefined) {
    returnedAssignment.livesSaved = result.livesSaved;
  }

  return returnedAssignment;
}