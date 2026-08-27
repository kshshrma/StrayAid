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

export async function sendMessageToBackend(
  reportId: string,
  content: string,
  recipientId?: string
) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reportId, content, recipientId }),
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to send message");
  }
  return result.message;
}

export async function getUnreadMessagesFromBackend() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/unread-messages`, {
    method: "GET",
    headers,
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch unread messages");
  }
  return result.messages || [];
}

export async function getConversationFromBackend(reportId: string, otherUserId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_URL}/api/messages/report/${reportId}/conversation/${otherUserId}`,
    {
      method: "GET",
      headers,
    }
  );
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to load conversation");
  }
  return result.messages || [];
}

export async function markConversationAsReadOnBackend(reportId: string, senderId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_URL}/api/messages/report/${reportId}/read/${senderId}`,
    {
      method: "POST",
      headers,
    }
  );
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to mark conversation as read");
  }
  return result;
}
