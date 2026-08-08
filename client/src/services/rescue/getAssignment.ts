import { supabase } from "../../lib/supabase";

export async function getAssignment(
  assignmentId: string
) {
  const { data, error } = await supabase
    .from("rescue_assignments")
    .select("*")
    .eq("id", assignmentId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}