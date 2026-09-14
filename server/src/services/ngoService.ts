export enum NgoVerificationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SUSPENDED = "SUSPENDED",
}

export type NgoRegistrationType =
  | "SOCIETY"
  | "SECTION_8"
  | "TRUST"
  | "INFORMAL_ORGANIZATION"
  | "OTHER";

export interface NgoCapacityInfo {
  current: number;
  max: number;
}

export interface RegisteredNGO {
  id: string; // organizationId
  name: string;
  isVerified: boolean; // Backwards-compatible flag (true if verificationStatus === APPROVED)
  verificationStatus: NgoVerificationStatus | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "pending" | "approved" | "rejected";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  availability: "available" | "busy" | "offline";
  location: string;
  categories: string[];
  description: string;
  phone: string;
  activeMembers: number;
  serviceArea: string;
  serviceAreas?: string[] | undefined;
  registrationType?: NgoRegistrationType | undefined;
  registrationNumber?: string | undefined;
  registrationDoc?: string | null | undefined;
  contactPerson?: string | undefined;
  officialPhone?: string | undefined;
  officialEmail?: string | undefined;
  animalTypes?: string[] | undefined;
  rescueCapabilities?: string[] | undefined;
  currentCapacity?: NgoCapacityInfo | undefined;
  emergencyAvailable?: boolean | undefined;
  representativeUserId: string; // Authorized NGO member account
  avatarUrl?: string | null | undefined;
  rejectionReason?: string | undefined;
  suspensionReason?: string | undefined;
  verificationRequestedAt?: string | undefined;
  verifiedAt?: string | undefined;
  verifiedBy?: string | undefined;
}

export interface EmergencyHelpline {
  id: string;
  name: string;
  description: string;
  phone: string;
  isAvailable247: boolean;
  type: "helpline";
}

export const REGISTERED_NGOS: RegisteredNGO[] = [
  {
    id: "ngo-greater-noida-rescuers",
    name: "Greater Noida Rescuers",
    isVerified: true,
    verificationStatus: NgoVerificationStatus.APPROVED,
    status: "ACTIVE",
    availability: "available",
    location: "Greater Noida & Noida Sector 1–150",
    categories: ["Rescue", "Injured Animals", "Strays", "Emergency Transport"],
    description: "Active rescue and emergency medical assistance group for local Street Guardians in Greater Noida.",
    phone: "+91 98765 43210",
    activeMembers: 42,
    serviceArea: "Greater Noida, Noida-Greater Noida Expressway, Alpha, Beta, Delta & Knowledge Park",
    serviceAreas: ["Greater Noida", "Noida Sector 1-150", "Alpha", "Beta", "Delta", "Knowledge Park"],
    registrationType: "SOCIETY",
    registrationNumber: "REG-UP-GN-2021-8842",
    contactPerson: "Dr. Rajesh Sharma (Lead Coordinator)",
    officialPhone: "+91 98765 43210",
    officialEmail: "contact@gnrescuers.org",
    animalTypes: ["DOG", "CAT", "CATTLE", "BIRD"],
    rescueCapabilities: ["ON_SITE_FIRST_AID", "AMBULANCE_TRANSPORT", "EMERGENCY_SURGERY_REFERRAL", "TEMPORARY_SHELTER"],
    currentCapacity: { current: 18, max: 35 },
    emergencyAvailable: true,
    representativeUserId: "6c4c4175-c2c4-470b-a5d5-c86639f3e949",
    avatarUrl: null,
    verifiedAt: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "ngo-vet-first-aid",
    name: "Veterinary First Aid Support",
    isVerified: true,
    verificationStatus: NgoVerificationStatus.APPROVED,
    status: "ACTIVE",
    availability: "available",
    location: "Delhi NCR / Greater Noida",
    categories: ["First Aid Advice", "Emergency Triage", "Vaccination Guidance", "Prescription Consult"],
    description: "Direct chat with certified veterinarians and experienced triage volunteers for live advice.",
    phone: "+91 98765 43211",
    activeMembers: 18,
    serviceArea: "Delhi, Noida, Greater Noida, Ghaziabad & Gurgaon",
    serviceAreas: ["Delhi NCR", "Noida", "Greater Noida", "Ghaziabad", "Gurgaon"],
    registrationType: "SECTION_8",
    registrationNumber: "SEC8-DL-2020-0491",
    contactPerson: "Dr. Ananya Verma (Chief Vet Officer)",
    officialPhone: "+91 98765 43211",
    officialEmail: "triage@vetfirstaidsupport.org",
    animalTypes: ["DOG", "CAT", "BIRD", "EXOTIC_SMALL"],
    rescueCapabilities: ["CRITICAL_TRIAGE", "TELE_CONSULTATION", "VET_DISPATCH", "POST_OP_RECOVERY"],
    currentCapacity: { current: 8, max: 20 },
    emergencyAvailable: true,
    representativeUserId: "a434a8d0-e23f-4388-8aac-fcd5fb38b2a6",
    avatarUrl: null,
    verifiedAt: "2026-02-15T08:30:00.000Z",
  },
  {
    id: "ngo-coordination-hub",
    name: "NGO Coordination Hub",
    isVerified: true,
    verificationStatus: NgoVerificationStatus.APPROVED,
    status: "ACTIVE",
    availability: "available",
    location: "Noida & Greater Noida",
    categories: ["Shelter Placement", "Fostering", "Adoption Coordination", "Transport Fleet"],
    description: "Connecting local rescue groups with partner shelters to coordinate animal admission and transport.",
    phone: "+91 98765 43212",
    activeMembers: 27,
    serviceArea: "All major animal shelters in Noida & Greater Noida",
    serviceAreas: ["Noida", "Greater Noida", "Sector 62-137"],
    registrationType: "TRUST",
    registrationNumber: "TR-UP-NOI-2019-1120",
    contactPerson: "Priya Menon (Rescue Operations Director)",
    officialPhone: "+91 98765 43212",
    officialEmail: "ops@ngocoordinationhub.in",
    animalTypes: ["DOG", "CAT", "CATTLE"],
    rescueCapabilities: ["INTER_NGO_COLLABORATION", "SHELTER_ADMISSION", "FOSTER_NETWORK", "ADOPTION_PIPELINE"],
    currentCapacity: { current: 22, max: 30 },
    emergencyAvailable: true,
    representativeUserId: "c5344b2a-c1b9-4489-aaa4-1b478d11ae5d",
    avatarUrl: null,
    verifiedAt: "2026-01-20T11:15:00.000Z",
  },
];

export const EMERGENCY_HELPLINES: EmergencyHelpline[] = [
  {
    id: "helpline-ambulance-ncr",
    name: "24/7 Animal Ambulance Delhi NCR",
    description: "Emergency helpline phone connection for critical rescue and transport assistance.",
    phone: "9988112233",
    isAvailable247: true,
    type: "helpline",
  },
  {
    id: "helpline-shelter-noida",
    name: "Noida Animal Shelter Helpline",
    description: "Direct contact line for shelter availability, emergency admission, and foster support.",
    phone: "8877665544",
    isAvailable247: true,
    type: "helpline",
  },
];

export function getRegisteredNgoById(organizationId: string): RegisteredNGO | null {
  return REGISTERED_NGOS.find((n) => n.id === organizationId) || null;
}

export function getNgoByRepresentativeUserId(userId: string): RegisteredNGO | null {
  return REGISTERED_NGOS.find((n) => n.representativeUserId === userId) || null;
}

/**
 * Security Gate: Checks if NGO is verified & actively eligible to receive cases.
 * Unapproved or suspended NGOs CANNOT receive private case data or dispatch requests.
 */
export function isNgoEligibleForDispatch(organizationId: string): boolean {
  const ngo = getRegisteredNgoById(organizationId);
  if (!ngo) return false;
  const statusStr = String(ngo.verificationStatus || "").toUpperCase();
  const isApproved = statusStr === "APPROVED" || ngo.isVerified === true;
  return isApproved && ngo.status === "ACTIVE";
}

/**
 * Returns only approved, active NGOs for public dispatch and operations
 */
export function getApprovedNgos(): RegisteredNGO[] {
  return REGISTERED_NGOS.filter((n) => isNgoEligibleForDispatch(n.id));
}

/**
 * Returns all registered NGOs including pending/rejected ones (for admins)
 */
export function getAllRegisteredNgos(): RegisteredNGO[] {
  return REGISTERED_NGOS;
}

/**
 * Admin Action: Approve an NGO organization
 */
export function approveNgo(
  organizationId: string,
  verifiedByUserId?: string
): { success: boolean; ngo?: RegisteredNGO; error?: string } {
  const ngo = getRegisteredNgoById(organizationId);
  if (!ngo) {
    return { success: false, error: `NGO with ID ${organizationId} not found` };
  }

  ngo.verificationStatus = NgoVerificationStatus.APPROVED;
  ngo.isVerified = true;
  ngo.status = "ACTIVE";
  ngo.verifiedAt = new Date().toISOString();
  if (verifiedByUserId) {
    ngo.verifiedBy = verifiedByUserId;
  }
  ngo.rejectionReason = undefined;
  ngo.suspensionReason = undefined;

  return { success: true, ngo };
}

/**
 * Admin Action: Reject an NGO registration request
 */
export function rejectNgo(
  organizationId: string,
  reason: string,
  rejectedByUserId?: string
): { success: boolean; ngo?: RegisteredNGO; error?: string } {
  const ngo = getRegisteredNgoById(organizationId);
  if (!ngo) {
    return { success: false, error: `NGO with ID ${organizationId} not found` };
  }

  ngo.verificationStatus = NgoVerificationStatus.REJECTED;
  ngo.isVerified = false;
  ngo.status = "INACTIVE";
  ngo.rejectionReason = reason || "Documentation or eligibility requirements not met.";
  if (rejectedByUserId) {
    ngo.verifiedBy = rejectedByUserId;
  }

  return { success: true, ngo };
}

/**
 * Admin Action: Suspend an NGO
 */
export function suspendNgo(
  organizationId: string,
  reason: string,
  suspendedByUserId?: string
): { success: boolean; ngo?: RegisteredNGO; error?: string } {
  const ngo = getRegisteredNgoById(organizationId);
  if (!ngo) {
    return { success: false, error: `NGO with ID ${organizationId} not found` };
  }

  ngo.verificationStatus = NgoVerificationStatus.SUSPENDED;
  ngo.isVerified = false;
  ngo.status = "SUSPENDED";
  ngo.suspensionReason = reason || "Organization suspended pending investigation.";
  if (suspendedByUserId) {
    ngo.verifiedBy = suspendedByUserId;
  }

  return { success: true, ngo };
}

/**
 * Update NGO capacity and emergency availability
 */
export function updateNgoCapacity(
  organizationId: string,
  updates: { current?: number; max?: number; emergencyAvailable?: boolean }
): { success: boolean; ngo?: RegisteredNGO; error?: string } {
  const ngo = getRegisteredNgoById(organizationId);
  if (!ngo) {
    return { success: false, error: `NGO with ID ${organizationId} not found` };
  }

  if (ngo.currentCapacity) {
    if (typeof updates.current === "number") {
      ngo.currentCapacity.current = updates.current;
    }
    if (typeof updates.max === "number") {
      ngo.currentCapacity.max = updates.max;
    }
  } else if (typeof updates.current === "number" || typeof updates.max === "number") {
    ngo.currentCapacity = {
      current: updates.current ?? 0,
      max: updates.max ?? 30,
    };
  }

  if (typeof updates.emergencyAvailable === "boolean") {
    ngo.emergencyAvailable = updates.emergencyAvailable;
  }

  return { success: true, ngo };
}
