import { supabase } from "../../lib/supabase";
import type {
  Organization,
  Helpline,
  NGOConversation,
  NGOMessage,
  RescueDetails,
  ReportSummaryContext,
  OrganizationMember,
} from "../../types/connect";

export type {
  Organization,
  Helpline,
  NGOConversation,
  NGOMessage,
  RescueDetails,
  ReportSummaryContext,
  OrganizationMember,
};

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

export async function fetchOrganizations(params: {
  type?: string;
  state?: string;
  city?: string;
  search?: string;
  emergencyOnly?: boolean;
  availableOnly?: boolean;
  lat?: number;
  lon?: number;
} = {}): Promise<Organization[]> {
  const query = new URLSearchParams();
  if (params.type && params.type !== "all") query.set("type", params.type);
  if (params.state && params.state !== "all") query.set("state", params.state);
  if (params.city && params.city !== "all") query.set("city", params.city);
  if (params.search) query.set("search", params.search);
  if (params.emergencyOnly) query.set("emergencyOnly", "true");
  if (params.availableOnly) query.set("availableOnly", "true");
  if (params.lat !== undefined) query.set("lat", params.lat.toString());
  if (params.lon !== undefined) query.set("lon", params.lon.toString());

  const response = await fetch(`${API_URL}/api/connect/organizations?${query.toString()}`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch organizations");
  }
  return result.organizations || [];
}

export async function fetchOrganizationById(id: string): Promise<Organization> {
  const response = await fetch(`${API_URL}/api/connect/organizations/${id}`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch organization details");
  }
  return result.organization;
}

export async function registerOrganizationOnBackend(formData: Partial<Organization>) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/connect/organizations/register`, {
    method: "POST",
    headers,
    body: JSON.stringify(formData),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to submit organization registration");
  }
  return result;
}

export async function fetchHelplines(params: {
  category?: string;
  state?: string;
  city?: string;
  search?: string;
  emergencyOnly?: boolean;
} = {}): Promise<{
  helplines: Helpline[];
  state1962Status: {
    state: string;
    isConfirmed: boolean;
    message: string;
  };
}> {
  const query = new URLSearchParams();
  if (params.category && params.category !== "all") query.set("category", params.category);
  if (params.state && params.state !== "all") query.set("state", params.state);
  if (params.city && params.city !== "all") query.set("city", params.city);
  if (params.search) query.set("search", params.search);
  if (params.emergencyOnly) query.set("emergencyOnly", "true");

  const response = await fetch(`${API_URL}/api/connect/helplines?${query.toString()}`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch helplines");
  }
  return {
    helplines: result.helplines || [],
    state1962Status: result.state1962Status || {
      state: "All India",
      isConfirmed: true,
      message: "",
    },
  };
}

export async function startNGOConversationOnBackend(data: {
  organizationId: string;
  requestType?: "general" | "lost_report" | "found_report" | "emergency_rescue" | "veterinary";
  reportId?: string;
  rescueDetails?: RescueDetails;
  initialMessage?: string;
  reportContext?: ReportSummaryContext;
}): Promise<{ conversation: NGOConversation; message: NGOMessage | null }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/connect/chat/start`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to start conversation with NGO");
  }
  return result;
}

export async function fetchMyNGOConversations(): Promise<NGOConversation[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/connect/chat/my-conversations`, {
    method: "GET",
    headers,
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch conversations");
  }
  return result.conversations || [];
}

export async function fetchNGOInbox(organizationId: string): Promise<NGOConversation[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/connect/chat/ngo-inbox/${organizationId}`, {
    method: "GET",
    headers,
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch NGO inbox");
  }
  return result.conversations || [];
}

export async function fetchNGOConversationDetails(conversationId: string): Promise<{
  conversation: NGOConversation;
  messages: NGOMessage[];
  isOrgMember: boolean;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/connect/chat/conversations/${conversationId}`, {
    method: "GET",
    headers,
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch conversation details");
  }
  return result;
}

export async function sendNGOMessageToBackend(
  conversationId: string,
  data: {
    content?: string;
    messageType?: "text" | "report_card" | "rescue_card" | "status_update";
    reportContext?: ReportSummaryContext;
  }
): Promise<NGOMessage> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/connect/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to send message to NGO");
  }
  return result.message;
}

export async function updateRescueStatusOnBackend(
  conversationId: string,
  status: "pending" | "reviewing" | "accepted" | "declined" | "in_progress" | "resolved"
): Promise<{ conversation: NGOConversation; message: NGOMessage }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/connect/chat/conversations/${conversationId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to update rescue status");
  }
  return result;
}
