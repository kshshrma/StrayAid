import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getCaseById, RescueCase, PaymentResponsibility } from "./caseService";

export interface VetClinic {
  id: string;
  name: string;
  doctorNames: string[];
  phone: string;
  emergencyPhone?: string | undefined;
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
  breed?: string | undefined;
  condition?: string | undefined;
  priority: "critical" | "urgent" | "normal";
  photos: string[];
  generalLocation: string;
  exactLocation: string;
  reporterContact?: string | undefined;
  medicalNotes?: string | undefined;
  paymentResponsibility: PaymentResponsibility;
  requestedTreatment?: string | undefined;
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
  notes?: string | undefined;
  snapshot: VetCaseSnapshot;
  createdAt: string;
}

const DATA_DIR = path.resolve("src/data");
const VETS_FILE = path.join(DATA_DIR, "vets.json");
const REFERRALS_FILE = path.join(DATA_DIR, "vet_referrals.json");

const SEED_VET_CLINICS: VetClinic[] = [
  {
    id: "vet-noida-care",
    name: "Dr. Paw 24/7 Trauma & Veterinary Hospital",
    doctorNames: ["Dr. Arvind Mehta (Surgery)", "Dr. Sunita Rao (Internal Med)"],
    phone: "+91 99112 33445",
    emergencyPhone: "+91 99112 33446",
    address: "Plot 14, Sector 62, Noida",
    city: "Noida",
    is24x7Emergency: true,
    facilities: ["X-Ray", "Ultrasound", "Emergency ICU", "Orthopedic Surgery", "Blood Testing"],
    acceptedPaymentModes: ["NGO Direct Account", "Online UPI", "Direct Donor Billing"],
  },
  {
    id: "vet-greater-noida-clinic",
    name: "Care & Cure Pet Clinic & Trauma Center",
    doctorNames: ["Dr. Rajesh Sharma", "Dr. Pooja Iyer"],
    phone: "+91 98223 44556",
    address: "Alpha Commercial Belt, Greater Noida",
    city: "Greater Noida",
    is24x7Emergency: true,
    facilities: ["Digital X-Ray", "Emergency Triage", "Minor Surgery", "Vaccination"],
    acceptedPaymentModes: ["NGO Billing", "UPI", "Pro-Bono Case Discounts"],
  },
  {
    id: "vet-street-aid-trust",
    name: "Stray Wildlife & Animal Medical Relief Centre",
    doctorNames: ["Dr. Meenakshi Sundaram"],
    phone: "+91 98334 55667",
    address: "Knowledge Park I, Greater Noida",
    city: "Greater Noida",
    is24x7Emergency: false,
    facilities: ["Stray Rehabilitation", "Sterilization", "Inpatient Ward"],
    acceptedPaymentModes: ["Pro-Bono", "NGO Sponsored", "Subsidized Rates"],
  },
];

async function ensureFilesExist() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
      await fs.access(VETS_FILE);
    } catch {
      await fs.writeFile(VETS_FILE, JSON.stringify(SEED_VET_CLINICS, null, 2), "utf-8");
    }

    try {
      await fs.access(REFERRALS_FILE);
    } catch {
      await fs.writeFile(REFERRALS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[VetService] File initialization error:", err);
  }
}

export async function readVetClinics(): Promise<VetClinic[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(VETS_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch {
    return [];
  }
}

export async function readReferrals(): Promise<VetReferral[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(REFERRALS_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch {
    return [];
  }
}

export async function writeReferrals(referrals: VetReferral[]): Promise<void> {
  await ensureFilesExist();
  await fs.writeFile(REFERRALS_FILE, JSON.stringify(referrals, null, 2), "utf-8");
}

/**
 * Generates full case snapshot for Veterinary Referral
 * Replaces vague requests with structured medical data
 */
export async function generateVetCaseSnapshot(
  caseId: string,
  requestedTreatment?: string | undefined
): Promise<VetCaseSnapshot | null> {
  const caseItem = await getCaseById(caseId);
  if (!caseItem) return null;

  return {
    caseId: caseItem.caseId,
    caseNumber: caseItem.caseNumber,
    animalType: caseItem.animalType,
    breed: caseItem.breed,
    condition: caseItem.condition,
    priority: caseItem.priority,
    photos: caseItem.photos,
    generalLocation: caseItem.generalLocation,
    exactLocation: caseItem.exactLocation,
    reporterContact: caseItem.reporterPhone,
    medicalNotes: caseItem.medicalNotes,
    paymentResponsibility: caseItem.paymentResponsibility,
    requestedTreatment: requestedTreatment || "Emergency trauma examination and medical stabilization",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Creates structured Vet Referral with snapshot
 */
export async function createVetReferral(data: {
  caseId: string;
  clinicId: string;
  referredByNgoId: string;
  paymentResponsibility: PaymentResponsibility;
  requestedTreatment?: string | undefined;
  notes?: string | undefined;
}): Promise<VetReferral | null> {
  const snapshot = await generateVetCaseSnapshot(data.caseId, data.requestedTreatment);
  if (!snapshot) return null;

  const clinics = await readVetClinics();
  const clinic = clinics.find((c) => c.id === data.clinicId);
  const clinicName = clinic ? clinic.name : "Partner Veterinary Clinic";

  const referrals = await readReferrals();
  const referral: VetReferral = {
    referralId: "vet_ref_" + crypto.randomUUID(),
    caseId: data.caseId,
    clinicId: data.clinicId,
    clinicName,
    referredByNgoId: data.referredByNgoId,
    paymentResponsibility: data.paymentResponsibility,
    status: "PENDING",
    notes: data.notes,
    snapshot,
    createdAt: new Date().toISOString(),
  };

  referrals.unshift(referral);
  await writeReferrals(referrals);
  return referral;
}
