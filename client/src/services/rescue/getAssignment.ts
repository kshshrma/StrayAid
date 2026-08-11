import { supabase } from "../../lib/supabase";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function getMyAssignments() {
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
    `${API_URL}/api/rescue/assignments`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Failed to fetch rescue assignments"
    );
  }

  return result.assignments;
}