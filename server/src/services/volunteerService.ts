import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface RescueVolunteerProfile {
  userId: string;
  name: string;
  phone: string;
  location: string;
  coordinates?: { latitude: number; longitude: number } | undefined;
  radiusKm: number;
  vehicle: "two_wheeler" | "car" | "ambulance" | "none";
  speciesHandled: string[];
  emergencyAvailable: boolean;
  activeAssignmentsCount: number;
  rating?: number | undefined;
}

export interface ExistingAnimal {
  species: string;
  size?: "small" | "medium" | "large" | undefined;
  temperament?: string | undefined;
}

export interface FosterProfile {
  userId: string;
  name: string;
  phone: string;
  location: string;
  homeAddress: string; // SENSITIVE: Only exposed to authorized NGO coordinators, NEVER to reporters/public
  acceptedSpecies: string[];
  totalCapacity: number;
  currentAnimalCount: number;
  emergencyAvailable: boolean;
  medicalCapabilities: string[]; // e.g. ["Basic Medication", "Post-Op Care", "Wound Dressing"]
  minimumDurationDays?: number | undefined;
  maximumDurationDays?: number | undefined;
  existingAnimals?: ExistingAnimal[] | undefined;
  notes?: string | undefined;
}

export interface AwarenessVolunteerProfile {
  userId: string;
  name: string;
  phone: string;
  city: string;
  campaignParticipationCount: number;
  socialMediaHandles?: string | undefined;
}

export interface CaseAssignment {
  assignmentId: string;
  caseId: string;
  assignedToUserId: string;
  assignedToName: string;
  role: "RESCUE" | "FOSTER" | "AWARENESS" | "VET";
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED";
  notes?: string | undefined;
  assignedAt: string;
  respondedAt?: string | undefined;
}

export interface FosterMatchFactor {
  label: string;
  isCompatible: boolean;
  detail: string;
  isWarning?: boolean | undefined;
}

export interface FosterMatchResult {
  foster: FosterProfile;
  compatibilityFactors: FosterMatchFactor[];
  isEligible: boolean;
}

const DATA_DIR = path.resolve("src/data");
const VOLUNTEERS_FILE = path.join(DATA_DIR, "volunteers.json");
const FOSTERS_FILE = path.join(DATA_DIR, "foster_profiles.json");
const ASSIGNMENTS_FILE = path.join(DATA_DIR, "case_assignments.json");

function getInitialVolunteers(): RescueVolunteerProfile[] {
  return [
    {
      userId: "vol-rescue-1",
      name: "Vikram Malhotra",
      phone: "+91 98111 22334",
      location: "Sector 62, Noida",
      coordinates: { latitude: 28.6258, longitude: 77.3653 },
      radiusKm: 15,
      vehicle: "car",
      speciesHandled: ["dog", "cat"],
      emergencyAvailable: true,
      activeAssignmentsCount: 1,
    },
    {
      userId: "vol-rescue-2",
      name: "Sameer Khan",
      phone: "+91 98222 33445",
      location: "Alpha 1, Greater Noida",
      coordinates: { latitude: 28.4721, longitude: 77.5098 },
      radiusKm: 20,
      vehicle: "two_wheeler",
      speciesHandled: ["dog", "cat", "bird"],
      emergencyAvailable: true,
      activeAssignmentsCount: 0,
    },
    {
      userId: "vol-rescue-3",
      name: "Sneha Patel",
      phone: "+91 98333 44556",
      location: "Knowledge Park III, Greater Noida",
      coordinates: { latitude: 28.4601, longitude: 77.4982 },
      radiusKm: 10,
      vehicle: "two_wheeler",
      speciesHandled: ["dog"],
      emergencyAvailable: false,
      activeAssignmentsCount: 0,
    },
  ];
}

function getInitialFosters(): FosterProfile[] {
  return [
    {
      userId: "foster-priya-1",
      name: "Priya Sharma",
      phone: "+91 98444 55667",
      location: "Sector 18, Noida",
      homeAddress: "Flat 402, Green Valley Apartments, Sector 18, Noida (Confidential)",
      acceptedSpecies: ["dog", "cat"],
      totalCapacity: 3,
      currentAnimalCount: 1,
      emergencyAvailable: true,
      medicalCapabilities: ["Basic Medication", "Post-Op Recovery", "Wound Dressing"],
      minimumDurationDays: 7,
      maximumDurationDays: 45,
      existingAnimals: [
        { species: "dog", size: "small", temperament: "Friendly & vaccinated" },
      ],
      notes: "Has a secure balcony and quiet room for injured animal convalescence.",
    },
    {
      userId: "foster-amit-2",
      name: "Amit Desai",
      phone: "+91 98555 66778",
      location: "Beta 2, Greater Noida",
      homeAddress: "House 12, Street 4, Beta 2, Greater Noida (Confidential)",
      acceptedSpecies: ["dog"],
      totalCapacity: 2,
      currentAnimalCount: 2,
      emergencyAvailable: false,
      medicalCapabilities: ["Basic Medication"],
      minimumDurationDays: 14,
      maximumDurationDays: 30,
      existingAnimals: [
        { species: "dog", size: "large", temperament: "Energetic indie" },
      ],
      notes: "Fenced lawn space, currently at capacity.",
    },
    {
      userId: "foster-neha-3",
      name: "Neha Gupta",
      phone: "+91 98666 77889",
      location: "Pari Chowk, Greater Noida",
      homeAddress: "Tower B, Supertech Czar, Greater Noida (Confidential)",
      acceptedSpecies: ["cat"],
      totalCapacity: 2,
      currentAnimalCount: 0,
      emergencyAvailable: true,
      medicalCapabilities: ["Kitten Bottle-Feeding", "Basic Medication"],
      minimumDurationDays: 5,
      maximumDurationDays: 60,
      existingAnimals: [],
      notes: "Specialized in neonate kitten care and post-treatment rest.",
    },
  ];
}

async function ensureFilesExist() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
      await fs.access(VOLUNTEERS_FILE);
    } catch {
      await fs.writeFile(VOLUNTEERS_FILE, JSON.stringify(getInitialVolunteers(), null, 2), "utf-8");
    }

    try {
      await fs.access(FOSTERS_FILE);
    } catch {
      await fs.writeFile(FOSTERS_FILE, JSON.stringify(getInitialFosters(), null, 2), "utf-8");
    }

    try {
      await fs.access(ASSIGNMENTS_FILE);
    } catch {
      await fs.writeFile(ASSIGNMENTS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[VolunteerService] File initialization error:", err);
  }
}

export async function readVolunteers(): Promise<RescueVolunteerProfile[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(VOLUNTEERS_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch {
    return [];
  }
}

export async function readFosters(): Promise<FosterProfile[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(FOSTERS_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch {
    return [];
  }
}

export async function readAssignments(): Promise<CaseAssignment[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(ASSIGNMENTS_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch {
    return [];
  }
}

export async function writeAssignments(assignments: CaseAssignment[]): Promise<void> {
  await ensureFilesExist();
  await fs.writeFile(ASSIGNMENTS_FILE, JSON.stringify(assignments, null, 2), "utf-8");
}

/**
 * Assign Volunteer to Case
 */
export async function createCaseAssignment(data: {
  caseId: string;
  assignedToUserId: string;
  assignedToName: string;
  role: "RESCUE" | "FOSTER" | "AWARENESS" | "VET";
  notes?: string | undefined;
}): Promise<CaseAssignment> {
  const assignments = await readAssignments();
  const assignment: CaseAssignment = {
    assignmentId: "asgn_" + crypto.randomUUID(),
    caseId: data.caseId,
    assignedToUserId: data.assignedToUserId,
    assignedToName: data.assignedToName,
    role: data.role,
    status: "PENDING",
    notes: data.notes,
    assignedAt: new Date().toISOString(),
  };

  assignments.unshift(assignment);
  await writeAssignments(assignments);
  return assignment;
}

/**
 * Match Fosters with transparent factors (NO arbitrary match percentage)
 */
export async function matchFostersForCase(caseRequirements: {
  animalType: "dog" | "cat" | "other";
  medicalRequired?: boolean | undefined;
  estimatedDurationDays?: number | undefined;
  requiresEmergency?: boolean | undefined;
}): Promise<FosterMatchResult[]> {
  const fosters = await readFosters();

  return fosters.map((foster) => {
    const factors: FosterMatchFactor[] = [];
    let isEligible = true;

    // 1. Species compatibility
    const acceptsSpecies = foster.acceptedSpecies.includes(caseRequirements.animalType);
    factors.push({
      label: "Species Compatibility",
      isCompatible: acceptsSpecies,
      detail: acceptsSpecies
        ? `✓ Accepts ${caseRequirements.animalType}s`
        : `✗ Does not foster ${caseRequirements.animalType}s`,
    });
    if (!acceptsSpecies) isEligible = false;

    // 2. Space & Capacity
    const availableSlots = foster.totalCapacity - foster.currentAnimalCount;
    const hasCapacity = availableSlots > 0;
    factors.push({
      label: "Foster Capacity",
      isCompatible: hasCapacity,
      detail: hasCapacity
        ? `✓ ${availableSlots} space(s) available (${foster.currentAnimalCount}/${foster.totalCapacity} currently occupied)`
        : `✗ Full capacity (${foster.currentAnimalCount}/${foster.totalCapacity})`,
      isWarning: !hasCapacity,
    });
    if (!hasCapacity) isEligible = false;

    // 3. Emergency availability
    if (caseRequirements.requiresEmergency) {
      factors.push({
        label: "Emergency Availability",
        isCompatible: foster.emergencyAvailable,
        detail: foster.emergencyAvailable
          ? "✓ Available for immediate emergency intake"
          : "⚠ Scheduled intake only",
        isWarning: !foster.emergencyAvailable,
      });
    }

    // 4. Medical capabilities
    if (caseRequirements.medicalRequired) {
      const hasMedical = foster.medicalCapabilities.length > 0;
      factors.push({
        label: "Medical Care Capability",
        isCompatible: hasMedical,
        detail: hasMedical
          ? `✓ Can administer: ${foster.medicalCapabilities.join(", ")}`
          : "⚠ Basic care only (no medical training recorded)",
        isWarning: !hasMedical,
      });
    }

    // 5. Existing animals
    if (foster.existingAnimals && foster.existingAnimals.length > 0) {
      const existingSummary = foster.existingAnimals
        .map((a) => `${a.size || ""} ${a.species} (${a.temperament || "normal"})`)
        .join(", ");
      factors.push({
        label: "Existing Pets in Home",
        isCompatible: true,
        detail: `ℹ️ Has existing animals: ${existingSummary}`,
        isWarning: foster.existingAnimals.length >= 2,
      });
    } else {
      factors.push({
        label: "Existing Pets in Home",
        isCompatible: true,
        detail: "✓ No existing pets in home",
      });
    }

    return {
      foster,
      compatibilityFactors: factors,
      isEligible,
    };
  });
}
