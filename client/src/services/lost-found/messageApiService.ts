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

export async function getInboxFromBackend() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/inbox`, {
    method: "GET",
    headers,
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to load inbox");
  }
  return result.conversations || [];
}

export async function startConversationOnBackend(reportId: string, content: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reportId, content }),
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to start conversation");
  }
  return result; // contains { conversation, message }
}

export async function getConversationMessagesFromBackend(conversationId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/conversations/${conversationId}`, {
    method: "GET",
    headers,
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to load conversation details");
  }
  return result; // contains { conversation, messages }
}

export async function sendMessageToConversation(conversationId: string, content: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content }),
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to send message");
  }
  return result.message;
}

export async function markConversationAsReadOnBackend(conversationId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/read`, {
    method: "POST",
    headers,
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to mark read");
  }
  return result;
}

export async function blockConversation(conversationId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/block`, {
    method: "POST",
    headers,
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to block participant");
  }
  return result;
}

export async function reportConversation(conversationId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/report`, {
    method: "POST",
    headers,
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to report content");
  }
  return result;
}

// Legacy helpers for backwards compatibility / compilation
export async function sendMessageToBackend(reportId: string, content: string, recipientId?: string) {
  const inbox = await getInboxFromBackend();
  const existing = inbox.find((c: any) => c.reportId === reportId && c.otherParticipantId === recipientId);
  if (existing) {
    return sendMessageToConversation(existing.conversationId, content);
  }
  const result = await startConversationOnBackend(reportId, content);
  return result.message;
}

export async function getConversationFromBackend(reportId: string, otherUserId: string) {
  const inbox = await getInboxFromBackend();
  const existing = inbox.find((c: any) => c.reportId === reportId && c.otherParticipantId === otherUserId);
  if (existing) {
    const details = await getConversationMessagesFromBackend(existing.conversationId);
    return details.messages || [];
  }
  return [];
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
