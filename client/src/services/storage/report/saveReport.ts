import { supabase } from "../../lib/supabase";

interface ReportData {
  image_url: string;
  latitude: number;
  longitude: number;
}

export async function saveReport(report: ReportData) {
  const { data, error } = await supabase
    .from("reports")
    .insert([
      {
        image_url: report.image_url,
        latitude: report.latitude,
        longitude: report.longitude,
        status: "Pending",
      },
    ])
    .select();

  if (error) {
    throw error;
  }

  return data;
}