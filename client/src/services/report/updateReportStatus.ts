import { supabase } from "../../lib/supabase";

export async function updateReportStatus(
  reportId: string,
  status: string
) {
  const updateData: any = {
    status,
  };

  switch (status) {
    case "Assigned":
      updateData.assigned_at = new Date().toISOString();
      break;

    case "Accepted":
      updateData.accepted_at = new Date().toISOString();
      break;

    case "En Route":
      updateData.enroute_at = new Date().toISOString();
      break;

    case "Rescuing":
      updateData.rescued_at = new Date().toISOString();
      break;

    case "Completed":
      updateData.completed_at = new Date().toISOString();
      break;
  }

  const { data, error } = await supabase
    .from("reports")
    .update(updateData)
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;

  return data;
}