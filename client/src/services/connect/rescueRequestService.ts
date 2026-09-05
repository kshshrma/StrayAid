import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("User not authenticated");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export interface BotRescueRequestPayload {
  ngoId: string;
  rescueType: "injured_animal" | "trapped_animal" | "weak_abandoned_baby";
  subType?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  manualLocation?: string | null;
  imageUrl?: string | null;
  inDanger?: boolean;
  notes?: string | null;
}

export async function createBotRescueRequestOnBackend(payload: BotRescueRequestPayload) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/rescue/bot-request`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to create rescue request");
  }
  return result; // contains { success: true, reportId, conversationId, message }
}
