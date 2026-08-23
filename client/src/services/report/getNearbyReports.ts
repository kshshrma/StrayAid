import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function getNearbyReports(
  latitude?: number | null,
  longitude?: number | null,
  radius: number = 10
) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error("User is not authenticated");
  }

  // Construct URL with query parameters if coords are specified
  let url = `${API_URL}/api/reports/nearby?radius=${radius}`;
  if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
    url += `&latitude=${latitude}&longitude=${longitude}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch nearby reports");
  }

  return result.reports || [];
}
