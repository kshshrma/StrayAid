import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  console.log("Calling AI Backend...", `${API_URL}/api/ai/analyze`);

  let aiResult: any = null;
  try {
    const response = await fetch(`${API_URL}/api/ai/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportId: data.id,
        imageUrl: data.image_url,
      }),
    });

    if (response.ok) {
      aiResult = await response.json();
      console.log("AI Result:", aiResult);
    } else {
      console.warn("AI backend returned status:", response.status);
    }
  } catch (backendError) {
    console.warn(
      "[saveReport] AI backend call failed (report is safely saved in Supabase):",
      backendError
    );
  }

  return {
    report: data,
    ai: aiResult?.ai || null,
  };
}