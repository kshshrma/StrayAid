import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isNgoEligibleForDispatch, getApprovedNgos } from "./ngoService";

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

export interface EscalationEvent {
  caseId: string;
  ngoId?: string | undefined;
  reason: "rejected" | "timeout" | "capacity" | "no_eligible_ngo";
  timestamp: string;
  details?: string | undefined;
}

export interface CaseTimelineEvent {
  eventId: string;
  caseId: string;
  type: string;
  fromStatus?: CaseStatus | undefined;
  toStatus?: CaseStatus | undefined;
  actorId: string;
  actorRole?: "REPORTER" | "NGO" | "VOLUNTEER" | "VET" | "FOSTER" | "ADMIN" | "SYSTEM" | undefined;
  actorName?: string | undefined;
  reason?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
}

export interface RescueCase {
  caseId: string;
  caseNumber: string; // e.g. "SA-1024"
  reportId?: string | undefined;

  animalType: "dog" | "cat" | "other";
  breed?: string | undefined;
  condition?: string | undefined;

  priority: "critical" | "urgent" | "normal";
  status: CaseStatus;

  reporterId: string;
  reporterName?: string | undefined;
  reporterPhone?: string | undefined;

  exactLocation: string;
  generalLocation: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | undefined;

  photos: string[];

  assignedNgoId?: string | undefined;
  assignedVolunteerId?: string | undefined;
  assignedVetId?: string | undefined;
  assignedFosterId?: string | undefined;

  medicalNotes?: string | undefined;
  internalNotes?: string | undefined;
  paymentResponsibility: PaymentResponsibility;

  responseDeadline?: string | undefined; // 15-min countdown for NGO response
  escalationHistory: EscalationEvent[];

  createdAt: string;
  updatedAt: string;
}

export interface OfflineStatusUpdate {
  caseId: string;
  status: CaseStatus;
  timestamp: string;
  volunteerId: string;
  volunteerName?: string | undefined;
  notes?: string | undefined;
  coordinates?: { latitude: number; longitude: number } | undefined;
}

/**
 * Valid Non-linear State Transitions Map
 * Enforced on the backend
 */
export const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  NEW: ["PENDING_NGO_RESPONSE", "ESCALATING", "DECEASED"],
  PENDING_NGO_RESPONSE: ["ACCEPTED", "ESCALATING", "DECEASED"],
  ACCEPTED: ["VOLUNTEER_ASSIGNMENT_REQUIRED", "RESCUE_IN_PROGRESS", "ANIMAL_SECURED", "MEDICAL_REQUIRED", "FOSTER_REQUIRED", "ESCALATING", "DECEASED"],
  VOLUNTEER_ASSIGNMENT_REQUIRED: ["VOLUNTEER_ASSIGNED", "ESCALATING", "DECEASED"],
  VOLUNTEER_ASSIGNED: ["RESCUE_IN_PROGRESS", "VOLUNTEER_ASSIGNMENT_REQUIRED", "DECEASED"],
  RESCUE_IN_PROGRESS: ["ANIMAL_SECURED", "VOLUNTEER_ASSIGNMENT_REQUIRED", "DECEASED"],
  ANIMAL_SECURED: ["MEDICAL_REQUIRED", "FOSTER_REQUIRED", "RECOVERY", "DECEASED"],
  MEDICAL_REQUIRED: ["MEDICAL_CARE", "DECEASED"],
  MEDICAL_CARE: ["MEDICAL_STALLED", "FOSTER_REQUIRED", "RECOVERY", "DECEASED"],
  MEDICAL_STALLED: ["MEDICAL_CARE", "DECEASED"],
  FOSTER_REQUIRED: ["FOSTER_ASSIGNED", "RECOVERY", "DECEASED"],
  FOSTER_ASSIGNED: ["FOSTER_UNAVAILABLE", "RECOVERY", "DECEASED"],
  FOSTER_UNAVAILABLE: ["FOSTER_REQUIRED", "DECEASED"],
  RECOVERY: ["ADOPTION", "REUNIFICATION", "RESOLVED", "DECEASED"],
  ADOPTION: ["RESOLVED", "RECOVERY"],
  REUNIFICATION: ["RESOLVED", "RECOVERY"],
  RESOLVED: ["REOPENED"],
  REOPENED: ["ACCEPTED", "VOLUNTEER_ASSIGNMENT_REQUIRED", "MEDICAL_REQUIRED", "FOSTER_REQUIRED"],
  ESCALATING: ["PENDING_NGO_RESPONSE", "ACCEPTED", "VOLUNTEER_ASSIGNMENT_REQUIRED", "DECEASED"],
  DECEASED: [], // Terminal outcome
};

const DATA_DIR = path.resolve("src/data");
const CASES_FILE = path.join(DATA_DIR, "cases.json");
const TIMELINE_FILE = path.join(DATA_DIR, "case_timeline.json");

let caseCounter = 1024;

async function ensureFilesExist() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
      await fs.access(CASES_FILE);
    } catch {
      await fs.writeFile(CASES_FILE, JSON.stringify(getInitialSeedCases(), null, 2), "utf-8");
    }

    try {
      await fs.access(TIMELINE_FILE);
    } catch {
      await fs.writeFile(TIMELINE_FILE, JSON.stringify(getInitialSeedTimeline(), null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[CaseService] Error initializing files:", err);
  }
}

function getInitialSeedCases(): RescueCase[] {
  return [
    {
      caseId: "case-sa-1024",
      caseNumber: "SA-1024",
      animalType: "dog",
      breed: "Indie / Stray Dog",
      condition: "Fractured hind leg, needs immediate rescue and examination",
      priority: "critical",
      status: "ACCEPTED",
      reporterId: "user-reporter-demo-1",
      reporterName: "Ananya Sharma",
      reporterPhone: "+91 98765 11111",
      exactLocation: "Opposite Gate 3, Pari Chowk Metro Station, Greater Noida",
      generalLocation: "Pari Chowk, Greater Noida",
      coordinates: { latitude: 28.4682, longitude: 77.5147 },
      photos: [
        "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800",
      ],
      assignedNgoId: "ngo-greater-noida-rescuers",
      assignedVolunteerId: "vol-rescue-1",
      paymentResponsibility: "ngo",
      escalationHistory: [],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      caseId: "case-sa-1025",
      caseNumber: "SA-1025",
      animalType: "cat",
      breed: "Domestic Shorthair",
      condition: "Weak abandoned kitten, dehydrated",
      priority: "urgent",
      status: "PENDING_NGO_RESPONSE",
      reporterId: "user-reporter-demo-2",
      reporterName: "Rohan Verma",
      reporterPhone: "+91 98765 22222",
      exactLocation: "Near Pillar 42, Sector 62, Noida",
      generalLocation: "Sector 62, Noida",
      coordinates: { latitude: 28.6258, longitude: 77.3653 },
      photos: [
        "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800",
      ],
      assignedNgoId: "ngo-greater-noida-rescuers",
      paymentResponsibility: "unknown",
      responseDeadline: new Date(Date.now() + 15 * 60000).toISOString(),
      escalationHistory: [],
      createdAt: new Date(Date.now() - 600000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      caseId: "case-sa-1026",
      caseNumber: "SA-1026",
      animalType: "dog",
      breed: "Labrador Mix",
      condition: "Rescued from drain, under post-surgery recovery",
      priority: "normal",
      status: "RECOVERY",
      reporterId: "user-reporter-demo-3",
      reporterName: "Kavita Rao",
      reporterPhone: "+91 98765 33333",
      exactLocation: "Knowledge Park III, Greater Noida",
      generalLocation: "Knowledge Park, Greater Noida",
      coordinates: { latitude: 28.4601, longitude: 77.4982 },
      photos: [
        "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=800",
      ],
      assignedNgoId: "ngo-coordination-hub",
      assignedFosterId: "foster-priya-1",
      paymentResponsibility: "ngo",
      escalationHistory: [],
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getInitialSeedTimeline(): CaseTimelineEvent[] {
  return [
    {
      eventId: "evt-1",
      caseId: "case-sa-1024",
      type: "CASE_CREATED",
      toStatus: "PENDING_NGO_RESPONSE",
      actorId: "user-reporter-demo-1",
      actorRole: "REPORTER",
      actorName: "Ananya Sharma",
      reason: "Citizen submitted rescue request via automated bot",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      eventId: "evt-2",
      caseId: "case-sa-1024",
      type: "NGO_ACCEPTED",
      fromStatus: "PENDING_NGO_RESPONSE",
      toStatus: "ACCEPTED",
      actorId: "6c4c4175-c2c4-470b-a5d5-c86639f3e949",
      actorRole: "NGO",
      actorName: "Greater Noida Rescuers Team",
      reason: "NGO accepted rescue case for dispatch",
      createdAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    },
    {
      eventId: "evt-3",
      caseId: "case-sa-1025",
      type: "CASE_CREATED",
      toStatus: "PENDING_NGO_RESPONSE",
      actorId: "user-reporter-demo-2",
      actorRole: "REPORTER",
      actorName: "Rohan Verma",
      reason: "Kitten rescue request submitted",
      createdAt: new Date(Date.now() - 600000).toISOString(),
    },
  ];
}

export async function readCases(): Promise<RescueCase[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(CASES_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch (e) {
    return [];
  }
}

export async function writeCases(cases: RescueCase[]): Promise<void> {
  await ensureFilesExist();
  await fs.writeFile(CASES_FILE, JSON.stringify(cases, null, 2), "utf-8");
}

export async function readTimeline(): Promise<CaseTimelineEvent[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(TIMELINE_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch (e) {
    return [];
  }
}

export async function writeTimeline(events: CaseTimelineEvent[]): Promise<void> {
  await ensureFilesExist();
  await fs.writeFile(TIMELINE_FILE, JSON.stringify(events, null, 2), "utf-8");
}

export async function logTimelineEvent(event: Omit<CaseTimelineEvent, "eventId" | "createdAt">): Promise<CaseTimelineEvent> {
  const timeline = await readTimeline();
  const newEvent: CaseTimelineEvent = {
    eventId: "evt_" + crypto.randomUUID(),
    caseId: event.caseId,
    type: event.type,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    actorId: event.actorId,
    actorRole: event.actorRole,
    actorName: event.actorName,
    reason: event.reason,
    metadata: event.metadata,
    createdAt: new Date().toISOString(),
  };
  timeline.push(newEvent);
  await writeTimeline(timeline);
  return newEvent;
}

export async function getCaseById(caseId: string): Promise<RescueCase | null> {
  const cases = await readCases();
  return cases.find((c) => c.caseId === caseId || c.caseNumber === caseId) || null;
}

export async function getCasesForUser(userId: string, userRole?: string, ngoId?: string): Promise<RescueCase[]> {
  const cases = await readCases();
  if (userRole === "admin") {
    return cases;
  }
  if (userRole === "ngo" && ngoId) {
    return cases.filter((c) => c.assignedNgoId === ngoId);
  }
  return cases.filter(
    (c) =>
      c.reporterId === userId ||
      c.assignedVolunteerId === userId ||
      c.assignedVetId === userId ||
      c.assignedFosterId === userId
  );
}

/**
 * Creates a new Rescue Case
 */
export async function createRescueCase(data: {
  reportId?: string | undefined;
  animalType: "dog" | "cat" | "other";
  breed?: string | undefined;
  condition?: string | undefined;
  priority?: "critical" | "urgent" | "normal" | undefined;
  reporterId: string;
  reporterName?: string | undefined;
  reporterPhone?: string | undefined;
  exactLocation: string;
  generalLocation?: string | undefined;
  coordinates?: { latitude: number; longitude: number } | undefined;
  photos?: string[] | undefined;
  targetNgoId?: string | undefined;
  paymentResponsibility?: PaymentResponsibility | undefined;
}): Promise<RescueCase> {
  const cases = await readCases();
  const newNumber = `SA-${++caseCounter + cases.length}`;
  const caseId = "case_" + crypto.randomUUID();

  // Validate NGO eligibility if assigned
  let assignedNgoId = data.targetNgoId;
  if (assignedNgoId && !isNgoEligibleForDispatch(assignedNgoId)) {
    // If targeted NGO is not eligible, find first eligible approved NGO
    const approvedNgos = getApprovedNgos();
    assignedNgoId = approvedNgos[0]?.id;
  }

  const initialStatus: CaseStatus = assignedNgoId ? "PENDING_NGO_RESPONSE" : "ESCALATING";

  const newCase: RescueCase = {
    caseId,
    caseNumber: newNumber,
    reportId: data.reportId,
    animalType: data.animalType || "dog",
    breed: data.breed,
    condition: data.condition,
    priority: data.priority || "normal",
    status: initialStatus,
    reporterId: data.reporterId,
    reporterName: data.reporterName,
    reporterPhone: data.reporterPhone,
    exactLocation: data.exactLocation,
    generalLocation: data.generalLocation || data.exactLocation.split(",")[0] || data.exactLocation,
    coordinates: data.coordinates,
    photos: data.photos || [],
    assignedNgoId,
    paymentResponsibility: data.paymentResponsibility || "unknown",
    responseDeadline: assignedNgoId ? new Date(Date.now() + 15 * 60000).toISOString() : undefined,
    escalationHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  cases.unshift(newCase);
  await writeCases(cases);

  await logTimelineEvent({
    caseId,
    type: "CASE_CREATED",
    toStatus: initialStatus,
    actorId: data.reporterId,
    actorRole: "REPORTER",
    actorName: data.reporterName || "Citizen Reporter",
    reason: "New rescue case registered in system",
    metadata: {
      priority: newCase.priority,
      animalType: newCase.animalType,
      assignedNgoId,
    },
  });

  return newCase;
}

/**
 * Validates and transitions case status according to state machine
 */
export async function transitionCaseStatus(
  caseId: string,
  newStatus: CaseStatus,
  actor: {
    actorId: string;
    actorRole: "REPORTER" | "NGO" | "VOLUNTEER" | "VET" | "FOSTER" | "ADMIN" | "SYSTEM";
    actorName?: string | undefined;
  },
  reason?: string | undefined,
  metadata?: Record<string, unknown> | undefined
): Promise<{ success: boolean; case?: RescueCase | undefined; error?: string | undefined }> {
  const cases = await readCases();
  const caseIndex = cases.findIndex((c) => c.caseId === caseId);

  if (caseIndex === -1) {
    return { success: false, error: "Case not found" };
  }

  const currentCase = cases[caseIndex];
  if (!currentCase) {
    return { success: false, error: "Case not found" };
  }

  const currentStatus = currentCase.status;

  // Validate state transition
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus) && actor.actorRole !== "ADMIN") {
    return {
      success: false,
      error: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(", ") || "None"}`,
    };
  }

  // Permission Check: Reporter cannot transition critical operational states
  if (actor.actorRole === "REPORTER") {
    return {
      success: false,
      error: "Reporters cannot modify case status directly. Operational status is managed by the NGO or assigned team.",
    };
  }

  // NGO verification security gate check
  if (actor.actorRole === "NGO" && currentCase.assignedNgoId) {
    if (!isNgoEligibleForDispatch(currentCase.assignedNgoId)) {
      return {
        success: false,
        error: "Forbidden: Unverified or inactive NGOs cannot transition case statuses.",
      };
    }
  }

  // Update status
  currentCase.status = newStatus;
  currentCase.updatedAt = new Date().toISOString();

  // If status is DECEASED, preserve medical timeline and notes with compassionate tone
  if (newStatus === "DECEASED") {
    currentCase.internalNotes = (currentCase.internalNotes || "") + `\n[DECEASED RECORDED]: ${reason || "Animal succumbed to injuries despite treatment."}`;
  }

  cases[caseIndex] = currentCase;
  await writeCases(cases);

  // Log timeline event
  await logTimelineEvent({
    caseId,
    type: `STATUS_CHANGE_${newStatus}`,
    fromStatus: currentStatus,
    toStatus: newStatus,
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    actorName: actor.actorName,
    reason,
    metadata,
  });

  return { success: true, case: currentCase };
}

/**
 * NGO Accepts Case
 */
export async function acceptCaseByNgo(
  caseId: string,
  ngoId: string,
  actor: { actorId: string; actorName?: string | undefined }
): Promise<{ success: boolean; case?: RescueCase | undefined; error?: string | undefined }> {
  if (!isNgoEligibleForDispatch(ngoId)) {
    return {
      success: false,
      error: "Security Gate: Only verified, active NGOs can accept rescue cases.",
    };
  }

  return transitionCaseStatus(
    caseId,
    "ACCEPTED",
    { actorId: actor.actorId, actorRole: "NGO", actorName: actor.actorName },
    "NGO coordinator accepted the rescue case",
    { acceptedNgoId: ngoId }
  );
}

/**
 * NGO Rejects Case -> Triggers automatic escalation
 */
export async function rejectCaseByNgo(
  caseId: string,
  ngoId: string,
  actor: { actorId: string; actorName?: string | undefined },
  reason: "capacity" | "rejected" | "out_of_area" = "capacity"
): Promise<{ success: boolean; case?: RescueCase | undefined; error?: string | undefined }> {
  const cases = await readCases();
  const caseItem = cases.find((c) => c.caseId === caseId);

  if (!caseItem) {
    return { success: false, error: "Case not found" };
  }

  // Record escalation event
  const escalationEvent: EscalationEvent = {
    caseId,
    ngoId,
    reason: reason === "capacity" ? "capacity" : "rejected",
    timestamp: new Date().toISOString(),
    details: `NGO ${ngoId} declined case: ${reason}`,
  };

  caseItem.escalationHistory.push(escalationEvent);

  // Find next eligible NGO
  const approvedNgos = getApprovedNgos().filter(
    (n) => n.id !== ngoId && !caseItem.escalationHistory.some((e) => e.ngoId === n.id)
  );

  if (approvedNgos.length > 0) {
    const nextNgo = approvedNgos[0];
    if (nextNgo) {
      caseItem.assignedNgoId = nextNgo.id;
      caseItem.status = "PENDING_NGO_RESPONSE";
      caseItem.responseDeadline = new Date(Date.now() + 15 * 60000).toISOString();
    }
  } else {
    // Escalate to Guardian / Emergency Network
    caseItem.status = "ESCALATING";
    caseItem.assignedNgoId = undefined;
  }

  caseItem.updatedAt = new Date().toISOString();
  await writeCases(cases);

  await logTimelineEvent({
    caseId,
    type: "NGO_REJECTED_AND_ESCALATED",
    fromStatus: "PENDING_NGO_RESPONSE",
    toStatus: caseItem.status,
    actorId: actor.actorId,
    actorRole: "NGO",
    actorName: actor.actorName,
    reason: `NGO rejected case (${reason}). Case re-routed to next responder.`,
    metadata: { previousNgoId: ngoId, nextNgoId: caseItem.assignedNgoId },
  });

  return { success: true, case: caseItem };
}

/**
 * Case Reopening
 */
export async function reopenCase(
  caseId: string,
  actor: { actorId: string; actorRole: any; actorName?: string | undefined },
  reason: string
): Promise<{ success: boolean; case?: RescueCase | undefined; error?: string | undefined }> {
  return transitionCaseStatus(
    caseId,
    "REOPENED",
    actor,
    reason || "Case reopened due to follow-up report / sighting",
    { reopenedAt: new Date().toISOString() }
  );
}

/**
 * Offline status updates batch sync (Phase 1)
 */
export async function syncOfflineStatusUpdates(
  updates: OfflineStatusUpdate[]
): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  let syncedCount = 0;
  const errors: string[] = [];

  for (const update of updates) {
    try {
      const result = await transitionCaseStatus(
        update.caseId,
        update.status,
        {
          actorId: update.volunteerId,
          actorRole: "VOLUNTEER",
          actorName: update.volunteerName || "Rescue Volunteer (Offline Sync)",
        },
        update.notes || "Field status update synced after reconnect",
        {
          offlineTimestamp: update.timestamp,
          coordinates: update.coordinates,
          syncedAt: new Date().toISOString(),
        }
      );

      if (result.success) {
        syncedCount++;
      } else {
        errors.push(`Case ${update.caseId}: ${result.error}`);
      }
    } catch (err: any) {
      errors.push(`Case ${update.caseId}: ${err?.message || "Sync failed"}`);
    }
  }

  return { success: errors.length === 0, syncedCount, errors };
}

/**
 * Information Tier Filtering
 * Protects sensitive addresses and internal notes
 */
export function filterCaseByInformationTier(
  c: RescueCase,
  requesterRole?: string,
  requesterUserId?: string
): Partial<RescueCase> {
  const isAuthorizedParticipant =
    requesterUserId &&
    (c.reporterId === requesterUserId ||
      c.assignedVolunteerId === requesterUserId ||
      c.assignedVetId === requesterUserId ||
      c.assignedFosterId === requesterUserId);

  const isNgoOrAdmin = requesterRole === "ngo" || requesterRole === "admin";

  // Tier 4: Admin & Tier 3: Internal NGO
  if (isNgoOrAdmin) {
    return c;
  }

  // Tier 2: Authorized Participants (Reporter, Assigned Volunteer)
  if (isAuthorizedParticipant) {
    const { internalNotes, ...participantData } = c;
    return participantData;
  }

  // Tier 1: Public / Unrelated Viewers
  return {
    caseId: c.caseId,
    caseNumber: c.caseNumber,
    animalType: c.animalType,
    breed: c.breed,
    condition: c.condition,
    priority: c.priority,
    status: c.status,
    generalLocation: c.generalLocation,
    photos: c.photos,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
