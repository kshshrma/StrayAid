import { supabase } from "../../lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export type CaseStatus =
  | "NEW"
  | "PENDING_NGO_RESPONSE"
  | "ACCEPTED"
  | "VOLUNTEER_ASSIGNMENT_REQUIRED"
  | "VOLUNTEER_ASSIGNED"
  | "RESCUE_IN_PROGRESS"
  | "ANIMAL_SECURED"
  | "MEDICAL_REQUIRED"
  | "MEDICAL_CARE"
  | "MEDICAL_STALLED"
  | "FOSTER_REQUIRED"
  | "FOSTER_ASSIGNED"
  | "FOSTER_UNAVAILABLE"
  | "RECOVERY"
  | "ADOPTION"
  | "REUNIFICATION"
  | "RESOLVED"
  | "REOPENED"
  | "ESCALATING"
  | "DECEASED";

export type PaymentResponsibility =
  | "ngo"
  | "reporter"
  | "donor"
  | "pro_bono"
  | "unknown";

export interface CaseTimelineEvent {
  eventId: string;
  caseId: string;
  type: string;
  fromStatus?: CaseStatus;
  toStatus?: CaseStatus;
  actorId: string;
  actorRole?: "REPORTER" | "NGO" | "VOLUNTEER" | "VET" | "FOSTER" | "ADMIN" | "SYSTEM";
  actorName?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RescueCase {
  caseId: string;
  caseNumber: string;
  reportId?: string;
  animalType: "dog" | "cat" | "other";
  breed?: string;
  condition?: string;
  priority: "critical" | "urgent" | "normal";
  status: CaseStatus;
  reporterId: string;
  reporterName?: string;
  reporterPhone?: string;
  exactLocation: string;
  generalLocation: string;
  coordinates?: { latitude: number; longitude: number };
  photos: string[];
  assignedNgoId?: string;
  assignedVolunteerId?: string;
  assignedVetId?: string;
  assignedFosterId?: string;
  medicalNotes?: string;
  internalNotes?: string;
  paymentResponsibility: PaymentResponsibility;
  responseDeadline?: string;
  escalationHistory?: {
    caseId: string;
    ngoId?: string;
    reason: string;
    timestamp: string;
    details?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface OfflineStatusUpdate {
  caseId: string;
  status: CaseStatus;
  timestamp: string;
  volunteerId: string;
  volunteerName?: string;
  notes?: string;
  coordinates?: { latitude: number; longitude: number };
}

export interface RescueVolunteerProfile {
  userId: string;
  name: string;
  phone: string;
  location: string;
  radiusKm: number;
  vehicle: "two_wheeler" | "car" | "ambulance" | "none";
  speciesHandled: string[];
  emergencyAvailable: boolean;
  activeAssignmentsCount: number;
}

export interface FosterProfile {
  userId: string;
  name: string;
  phone: string;
  location: string;
  homeAddress?: string;
  acceptedSpecies: string[];
  totalCapacity: number;
  currentAnimalCount: number;
  emergencyAvailable: boolean;
  medicalCapabilities: string[];
  minimumDurationDays?: number;
  maximumDurationDays?: number;
  existingAnimals?: { species: string; size?: string; temperament?: string }[];
  notes?: string;
}

export interface FosterMatchResult {
  foster: FosterProfile;
  compatibilityFactors: {
    label: string;
    isCompatible: boolean;
    detail: string;
    isWarning?: boolean;
  }[];
  isEligible: boolean;
}

export interface VetClinic {
  id: string;
  name: string;
  doctorNames: string[];
  phone: string;
  emergencyPhone?: string;
  address: string;
  city: string;
  is24x7Emergency: boolean;
  facilities: string[];
  acceptedPaymentModes: string[];
}

export interface VetCaseSnapshot {
  caseId: string;
  caseNumber: string;
  animalType: "dog" | "cat" | "other";
  breed?: string;
  condition?: string;
  priority: "critical" | "urgent" | "normal";
  photos: string[];
  generalLocation: string;
  exactLocation: string;
  reporterContact?: string;
  medicalNotes?: string;
  paymentResponsibility: PaymentResponsibility;
  requestedTreatment?: string;
  generatedAt: string;
}

export interface VetReferral {
  referralId: string;
  caseId: string;
  clinicId: string;
  clinicName: string;
  referredByNgoId: string;
  paymentResponsibility: PaymentResponsibility;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED";
  notes?: string;
  snapshot: VetCaseSnapshot;
  createdAt: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// 1. Create rescue case
export async function createRescueCaseOnBackend(data: {
  reportId?: string;
  animalType: "dog" | "cat" | "other";
  breed?: string;
  condition?: string;
  priority?: "critical" | "urgent" | "normal";
  exactLocation: string;
  generalLocation?: string;
  coordinates?: { latitude: number; longitude: number };
  photos?: string[];
  targetNgoId?: string;
  paymentResponsibility?: PaymentResponsibility;
}): Promise<RescueCase> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to create rescue case");
  }
  return json.case;
}

// 2. Fetch cases for user
export async function fetchRescueCases(ngoId?: string): Promise<RescueCase[]> {
  const headers = await getAuthHeaders();
  const url = ngoId ? `${API_BASE_URL}/api/cases?ngoId=${encodeURIComponent(ngoId)}` : `${API_BASE_URL}/api/cases`;
  const res = await fetch(url, { headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load rescue cases");
  }
  return json.cases || [];
}

// 3. Fetch single case details
export async function fetchCaseDetails(caseId: string): Promise<RescueCase> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, { headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load case details");
  }
  return json.case;
}

// 4. Update case status
export async function updateCaseStatusOnBackend(
  caseId: string,
  status: CaseStatus,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<RescueCase> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status, reason, metadata }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to transition case status");
  }
  return json.case;
}

// 5. NGO Accept Case
export async function acceptRescueCase(caseId: string, ngoId?: string): Promise<RescueCase> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}/accept`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ngoId }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to accept rescue case");
  }
  return json.case;
}

// 6. NGO Reject Case
export async function rejectRescueCase(caseId: string, ngoId?: string, reason?: string): Promise<RescueCase> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}/reject`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ngoId, reason }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to reject rescue case");
  }
  return json.case;
}

// 7. Reopen Case
export async function reopenRescueCase(caseId: string, reason: string): Promise<RescueCase> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}/reopen`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to reopen rescue case");
  }
  return json.case;
}

// 8. Fetch case timeline
export async function fetchCaseTimeline(caseId: string): Promise<CaseTimelineEvent[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}/timeline`, { headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load timeline");
  }
  return json.timeline || [];
}

// 9. Fetch volunteers list
export async function fetchVolunteersList(): Promise<RescueVolunteerProfile[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/volunteers/list`, { headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load volunteers");
  }
  return json.volunteers || [];
}

// 10. Match fosters for case
export async function fetchFosterMatches(caseId: string): Promise<FosterMatchResult[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/fosters/match/${caseId}`, { headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to match fosters");
  }
  return json.matches || [];
}

// 11. Assign volunteer to case
export async function assignVolunteerToCase(
  caseId: string,
  assignedToUserId: string,
  assignedToName: string,
  role: "RESCUE" | "FOSTER" | "AWARENESS" | "VET" = "RESCUE",
  notes?: string
): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}/assign-volunteer`, {
    method: "POST",
    headers,
    body: JSON.stringify({ assignedToUserId, assignedToName, role, notes }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to assign volunteer");
  }
  return json.assignment;
}

// 12. Fetch partner vet clinics
export async function fetchVetClinics(): Promise<VetClinic[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/vets/clinics`, { headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load veterinary clinics");
  }
  return json.clinics || [];
}

// 13. Fetch case snapshot for vet
export async function fetchVetSnapshot(caseId: string): Promise<VetCaseSnapshot> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/vets/snapshot/${caseId}`, { headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load vet snapshot");
  }
  return json.snapshot;
}

// 14. Create vet referral
export async function createVetReferralOnBackend(
  caseId: string,
  clinicId: string,
  paymentResponsibility: PaymentResponsibility = "ngo",
  requestedTreatment?: string,
  notes?: string
): Promise<VetReferral> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}/vet-referral`, {
    method: "POST",
    headers,
    body: JSON.stringify({ clinicId, paymentResponsibility, requestedTreatment, notes }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to create vet referral");
  }
  return json.referral;
}

// 15. Start or get case-centric conversation
export async function startCaseConversationOnBackend(
  caseId: string,
  type: "REPORTER_NGO" | "NGO_VOLUNTEER" | "NGO_VET" | "CASE_GROUP" = "CASE_GROUP",
  title?: string
): Promise<{ conversation: any; messages: any[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/messages/case/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({ caseId, type, title }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to start case conversation");
  }
  return { conversation: json.conversation, messages: json.messages || [] };
}

// 16. Sync offline field updates
export async function syncOfflineStatus(
  updates: OfflineStatusUpdate[]
): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/cases/sync-offline-status`, {
    method: "POST",
    headers,
    body: JSON.stringify({ updates }),
  });

  const json = await res.json();
  return json;
}
