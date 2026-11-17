import { supabase } from "../../lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export type ConnectRequestType =
  | "rescue"
  | "adoption"
  | "medical"
  | "feeding"
  | "volunteer"
  | "donation"
  | "general";

export type ConnectRequestStatus =
  | "new"
  | "received"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "cancelled";

export type ConnectRequestUrgency = "emergency" | "urgent" | "normal";

export interface ConnectRequestMetadata {
  transport_mode?: "ngo_transport" | "user_self_transport";
  trap_location_type?: string;
  in_danger?: boolean;
  animal_preference?: string;
  adoption_type?: "adopt" | "foster" | "learn";
  location_preference?: string;
  medical_concern?: string;
  volunteer_interest?: string;
  donation_target?: string;
  conversation_id?: string;
  general_enquiry_type?: string;
  reporter_name?: string;
  reporter_phone?: string;
  ngo_notes?: string;
  assigned_volunteer_id?: string;
  [key: string]: any;
}

export interface ConnectRequest {
  id: string;
  userId: string;
  organizationId: string;
  requestType: ConnectRequestType;
  subType?: string;
  status: ConnectRequestStatus;
  urgency: ConnectRequestUrgency;
  animalType?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationText?: string;
  imageUrl?: string | null;
  metadata: ConnectRequestMetadata;
  createdAt: string;
  updatedAt: string;
}

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Authentication session expired");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Create or update an active request for the current user bot flow
 */
export async function createOrUpdateConnectRequestApi(data: {
  requestId?: string;
  organizationId?: string;
  requestType: ConnectRequestType;
  subType?: string;
  status?: ConnectRequestStatus;
  urgency?: ConnectRequestUrgency;
  animalType?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationText?: string;
  imageUrl?: string | null;
  metadata?: ConnectRequestMetadata;
}): Promise<{ request: ConnectRequest; isNew: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/connect/requests`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to process connect request");
  }

  return { request: json.request, isNew: !!json.isNew };
}

/**
 * Update a specific connect request (e.g., adding location coordinates or manual address)
 */
export async function updateConnectRequestApi(
  requestId: string,
  updates: Partial<ConnectRequest>
): Promise<ConnectRequest> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/connect/requests/${requestId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(updates),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to update connect request");
  }

  return json.request;
}

/**
 * Fetch requests submitted by the logged in user
 */
export async function getUserConnectRequestsApi(): Promise<ConnectRequest[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/connect/requests`, {
    method: "GET",
    headers,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to fetch user requests");
  }

  return json.requests || [];
}

/**
 * NGO Feed: Fetch incoming requests for an organization with optional filters
 */
export async function getNgoConnectRequestsApi(params?: {
  organizationId?: string;
  type?: string;
  status?: string;
  urgency?: string;
}): Promise<ConnectRequest[]> {
  const headers = await getAuthHeaders();
  const searchParams = new URLSearchParams();

  if (params?.organizationId) searchParams.append("organizationId", params.organizationId);
  if (params?.type && params.type !== "all") searchParams.append("type", params.type);
  if (params?.status && params.status !== "all") searchParams.append("status", params.status);
  if (params?.urgency && params.urgency !== "all") searchParams.append("urgency", params.urgency);

  const qs = searchParams.toString();
  const url = `${API_BASE_URL}/api/connect/ngo/requests${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to fetch NGO connect requests");
  }

  return json.requests || [];
}

/**
 * NGO Action: Update request status, lifecycle, or add operational notes
 */
export async function updateNgoConnectRequestApi(
  requestId: string,
  updates: {
    status?: ConnectRequestStatus;
    notes?: string;
    assignedVolunteerId?: string;
  }
): Promise<ConnectRequest> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/connect/ngo/requests/${requestId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(updates),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to update request status");
  }

  return json.request;
}
