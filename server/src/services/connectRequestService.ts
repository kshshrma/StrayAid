import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { REGISTERED_NGOS, getRegisteredNgoById } from "./ngoService";

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
  transport_mode?: "ngo_transport" | "user_self_transport" | undefined;
  trap_location_type?: string | undefined;
  in_danger?: boolean | undefined;
  animal_preference?: string | undefined;
  adoption_type?: "adopt" | "foster" | "learn" | undefined;
  location_preference?: string | undefined;
  medical_concern?: string | undefined;
  volunteer_interest?: string | undefined;
  donation_target?: string | undefined;
  conversation_id?: string | undefined;
  general_enquiry_type?: string | undefined;
  reporter_name?: string | undefined;
  reporter_phone?: string | undefined;
  notes?: string | undefined;
  [key: string]: any;
}

export interface ConnectRequest {
  id: string;
  userId: string;
  organizationId: string;
  requestType: ConnectRequestType;
  subType?: string | undefined;
  status: ConnectRequestStatus;
  urgency: ConnectRequestUrgency;
  animalType?: string | undefined;
  description?: string | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  locationText?: string | undefined;
  imageUrl?: string | null | undefined;
  metadata: ConnectRequestMetadata;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.resolve("src/data");
const REQUESTS_FILE = path.join(DATA_DIR, "connect_requests.json");

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(REQUESTS_FILE);
    } catch {
      await fs.writeFile(REQUESTS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[ConnectRequestService] File init error:", err);
  }
}

async function loadRequests(): Promise<ConnectRequest[]> {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(REQUESTS_FILE, "utf-8");
    return JSON.parse(raw) as ConnectRequest[];
  } catch (err) {
    console.error("[ConnectRequestService] Error reading requests file:", err);
    return [];
  }
}

async function saveRequests(requests: ConnectRequest[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf-8");
}

function determineUrgency(
  requestType: ConnectRequestType,
  subType?: string | undefined,
  metadata?: ConnectRequestMetadata | undefined
): ConnectRequestUrgency {
  if (requestType === "rescue") {
    if (metadata?.in_danger || subType === "injured" || subType === "weak_or_abandoned_baby") {
      return "emergency";
    }
    if (subType === "trapped") {
      return "urgent";
    }
    return "urgent";
  }
  if (requestType === "medical") {
    if (metadata?.medical_concern?.toLowerCase().includes("emergency") || metadata?.in_danger) {
      return "emergency";
    }
    return "urgent";
  }
  return "normal";
}

/**
 * Create a new Connect Request
 */
export async function createConnectRequest(data: {
  userId: string;
  organizationId?: string | undefined;
  requestType: ConnectRequestType;
  subType?: string | undefined;
  status?: ConnectRequestStatus | undefined;
  urgency?: ConnectRequestUrgency | undefined;
  animalType?: string | undefined;
  description?: string | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  locationText?: string | undefined;
  imageUrl?: string | null | undefined;
  metadata?: ConnectRequestMetadata | undefined;
}): Promise<ConnectRequest> {
  const requests = await loadRequests();

  let orgId = data.organizationId;
  if (!orgId || !getRegisteredNgoById(orgId)) {
    orgId = REGISTERED_NGOS[0]?.id || "ngo-greater-noida-rescuers";
  }

  const urgency = data.urgency || determineUrgency(data.requestType, data.subType, data.metadata);

  const now = new Date().toISOString();
  const newRequest: ConnectRequest = {
    id: `req-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    userId: data.userId,
    organizationId: orgId,
    requestType: data.requestType,
    subType: data.subType,
    status: data.status || "new",
    urgency,
    animalType: data.animalType || "animal",
    description: data.description || "",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    locationText: data.locationText || "",
    imageUrl: data.imageUrl ?? null,
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  requests.unshift(newRequest);
  await saveRequests(requests);
  return newRequest;
}

export type ConnectRequestUpdates = {
  [K in keyof Omit<ConnectRequest, "id" | "userId" | "createdAt">]?:
    | ConnectRequest[K]
    | undefined;
};

/**
 * Update an existing Connect Request with new collected information
 */
export async function updateConnectRequest(
  requestId: string,
  updates: ConnectRequestUpdates
): Promise<ConnectRequest | null> {
  const requests = await loadRequests();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) return null;

  const current = requests[index];
  if (!current) return null;

  const mergedMetadata: ConnectRequestMetadata = {
    ...current.metadata,
    ...(updates.metadata || {}),
  };

  const updatedUrgency =
    updates.urgency ||
    determineUrgency(
      updates.requestType || current.requestType,
      updates.subType !== undefined ? updates.subType : current.subType,
      mergedMetadata
    );

  const updated: ConnectRequest = {
    id: current.id,
    userId: current.userId,
    organizationId: updates.organizationId || current.organizationId,
    requestType: updates.requestType || current.requestType,
    subType: updates.subType !== undefined ? updates.subType : current.subType,
    status: updates.status || current.status,
    urgency: updatedUrgency,
    animalType: updates.animalType !== undefined ? updates.animalType : current.animalType,
    description: updates.description !== undefined ? updates.description : current.description,
    latitude: updates.latitude !== undefined ? updates.latitude : current.latitude,
    longitude: updates.longitude !== undefined ? updates.longitude : current.longitude,
    locationText: updates.locationText !== undefined ? updates.locationText : current.locationText,
    imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : current.imageUrl,
    metadata: mergedMetadata,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };

  requests[index] = updated;
  await saveRequests(requests);
  return updated;
}

/**
 * Get or create an active request for a user bot session.
 */
export async function getOrCreateActiveRequest(data: {
  userId: string;
  requestId?: string | undefined;
  organizationId?: string | undefined;
  requestType: ConnectRequestType;
  subType?: string | undefined;
  status?: ConnectRequestStatus | undefined;
  urgency?: ConnectRequestUrgency | undefined;
  animalType?: string | undefined;
  description?: string | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  locationText?: string | undefined;
  imageUrl?: string | null | undefined;
  metadata?: ConnectRequestMetadata | undefined;
}): Promise<{ request: ConnectRequest; isNew: boolean }> {
  if (data.requestId) {
    const updated = await updateConnectRequest(data.requestId, data);
    if (updated) {
      return { request: updated, isNew: false };
    }
  }

  const requests = await loadRequests();
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

  const existing = requests.find(
    (r) =>
      r.userId === data.userId &&
      r.requestType === data.requestType &&
      r.status !== "resolved" &&
      r.status !== "cancelled" &&
      new Date(r.createdAt).getTime() > thirtyMinutesAgo
  );

  if (existing) {
    const updated = await updateConnectRequest(existing.id, data);
    return { request: updated || existing, isNew: false };
  }

  const created = await createConnectRequest(data);
  return { request: created, isNew: true };
}

export async function getConnectRequestById(requestId: string): Promise<ConnectRequest | null> {
  const requests = await loadRequests();
  return requests.find((r) => r.id === requestId) || null;
}

export async function getUserConnectRequests(userId: string): Promise<ConnectRequest[]> {
  const requests = await loadRequests();
  return requests
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getNgoConnectRequests(
  organizationId: string,
  filters?: {
    type?: string | undefined;
    status?: string | undefined;
    urgency?: string | undefined;
  }
): Promise<ConnectRequest[]> {
  const requests = await loadRequests();

  let filtered = requests.filter(
    (r) => r.organizationId.toLowerCase() === organizationId.toLowerCase()
  );

  if (filters?.type && filters.type !== "all") {
    filtered = filtered.filter(
      (r) => r.requestType.toLowerCase() === filters.type!.toLowerCase()
    );
  }

  if (filters?.status && filters.status !== "all") {
    filtered = filtered.filter(
      (r) => r.status.toLowerCase() === filters.status!.toLowerCase()
    );
  }

  if (filters?.urgency && filters.urgency !== "all") {
    filtered = filtered.filter(
      (r) => r.urgency.toLowerCase() === filters.urgency!.toLowerCase()
    );
  }

  const urgencyWeight: Record<ConnectRequestUrgency, number> = {
    emergency: 3,
    urgent: 2,
    normal: 1,
  };

  return filtered.sort((a, b) => {
    const urgencyDiff =
      (urgencyWeight[b.urgency] || 1) - (urgencyWeight[a.urgency] || 1);
    if (urgencyDiff !== 0) return urgencyDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
