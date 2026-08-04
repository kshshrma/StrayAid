import { supabase } from "../../lib/supabase";

interface ReportData {
  image_url: string;
  latitude: number;
  longitude: number;
}

export async function saveReport(report: ReportData) {
  // Save report
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
    .select()
    .single();

  if (error) throw error;

  console.log("Calling AI Backend...");

  const response = await fetch("http://localhost:5000/api/ai/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reportId: data.id,
      imageUrl: data.image_url,
    }),
  });

  const aiResult = await response.json();

  console.log("AI Result:", aiResult);

  return {
    report: data,
    ai: aiResult.ai,
  };
}