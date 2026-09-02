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

export interface RegisteredNGO {
  id: string;
  name: string;
  isVerified: boolean;
  availability: "available" | "busy" | "offline";
  location: string;
  categories: string[];
  description: string;
  phone: string;
  activeMembers: number;
  serviceArea: string;
  avatarUrl?: string | null;
}

export interface EmergencyHelpline {
  id: string;
  name: string;
  description: string;
  phone: string;
  isAvailable247: boolean;
  type: "helpline";
}

export interface ReportAttachmentMetadata {
  type: "report_attachment";
  reportId: string;
  animalType: string;
  breed?: string;
  status: "lost" | "found";
  location: string;
  urgency?: string;
  imageUrl?: string;
}

export async function getRegisteredNgos(): Promise<{ ngos: RegisteredNGO[]; helplines: EmergencyHelpline[] }> {
  const response = await fetch(`${API_URL}/api/messages/ngos`, {
    method: "GET",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to load NGOs list");
  }
  return {
    ngos: result.ngos || [],
    helplines: result.helplines || [],
  };
}

export async function startNgoConversationOnBackend(organizationId: string, initialMessage?: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/ngo/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({ organizationId, initialMessage }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to start NGO conversation");
  }
  return result; // contains { conversation, ngo, messages, createdMessage }
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
  return result; // contains { conversation, messages, ngoDetails }
}

export async function sendMessageToConversation(conversationId: string, content: string, metadata?: any) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content, metadata }),
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
