import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface OrganizationMember {
  userId: string;
  role: "admin" | "coordinator" | "vet" | "volunteer";
  name?: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  logo?: string | undefined;
  organizationType:
    | "rescue_ngo"
    | "veterinary"
    | "shelter"
    | "rescue_team"
    | "wildlife"
    | "animal_welfare";
  city: string;
  state: string;
  serviceAreas: string[];
  latitude?: number | undefined;
  longitude?: number | undefined;
  verified: boolean;
  verificationStatus: "verified" | "pending" | "rejected" | "suspended";
  active: boolean;
  emergencyAvailable: boolean;
  availabilityStatus: "available" | "limited" | "offline";
  emergencyResponseEnabled: boolean;
  operatingHours: string;
  phone: string;
  alternatePhone?: string | undefined;
  email: string;
  website?: string | undefined;
  address: string;
  members: OrganizationMember[];
  stats: {
    casesResolved: number;
    activeRescues: number;
  };
  createdAt: string;
  lastVerifiedAt: string;
  supportingDocuments?: string | undefined;
}

const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: "org-friendicoes",
    name: "Friendicoes SECA",
    description: "One of Delhi NCR's oldest animal welfare organizations running an animal hospital, 24/7 mobile ambulances, and shelter facilities.",
    logo: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=300",
    organizationType: "rescue_ngo",
    city: "New Delhi",
    state: "Delhi",
    serviceAreas: ["Delhi NCR", "South Delhi", "Central Delhi", "Noida", "Gurugram"],
    latitude: 28.5833,
    longitude: 77.2333,
    verified: true,
    verificationStatus: "verified",
    active: true,
    emergencyAvailable: true,
    availabilityStatus: "available",
    emergencyResponseEnabled: true,
    operatingHours: "24x7 Emergency Ambulance / 9:00 AM - 7:00 PM OPD",
    phone: "011-24314982",
    alternatePhone: "011-24320707",
    email: "friendicoes.india@gmail.com",
    website: "https://friendicoes.org",
    address: "271 & 272, Flyover Market, Defence Colony, New Delhi",
    members: [
      {
        userId: "system-ngo-friendicoes",
        role: "admin",
        name: "Dr. Geeta Seshamani (Director)",
      },
    ],
    stats: {
      casesResolved: 1420,
      activeRescues: 12,
    },
    createdAt: "2024-01-15T00:00:00.000Z",
    lastVerifiedAt: "2026-08-15T00:00:00.000Z",
  },
  {
    id: "org-gn-rescue",
    name: "Greater Noida Animal Rescue",
    description: "Dedicated street animal rescue team offering emergency triage, on-site first aid, sterilizations, and foster network support in Greater Noida.",
    logo: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300",
    organizationType: "rescue_team",
    city: "Greater Noida",
    state: "Uttar Pradesh",
    serviceAreas: ["Greater Noida", "Knowledge Park", "Pari Chowk", "Alpha", "Beta", "Gamma", "Delta", "Surajpur"],
    latitude: 28.4744,
    longitude: 77.504,
    verified: true,
    verificationStatus: "verified",
    active: true,
    emergencyAvailable: true,
    availabilityStatus: "available",
    emergencyResponseEnabled: true,
    operatingHours: "24x7 Emergency Response",
    phone: "+91 98112 34567",
    alternatePhone: "+91 98112 34568",
    email: "contact@gnanimalrescue.org",
    website: "https://gnanimalrescue.org",
    address: "Sector Alpha 1, Commercial Complex, Greater Noida",
    members: [
      {
        userId: "system-ngo-gn",
        role: "coordinator",
        name: "Aditya Sharma (Rescue Lead)",
      },
    ],
    stats: {
      casesResolved: 580,
      activeRescues: 6,
    },
    createdAt: "2024-03-10T00:00:00.000Z",
    lastVerifiedAt: "2026-08-20T00:00:00.000Z",
  },
  {
    id: "org-pfa-noida",
    name: "PFA Noida (People For Animals)",
    description: "Unit of People For Animals managing the Sector 94 animal hospital, veterinary emergency services, anti-cruelty investigations, and adoption.",
    logo: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300",
    organizationType: "animal_welfare",
    city: "Noida",
    state: "Uttar Pradesh",
    serviceAreas: ["Noida", "Greater Noida Expressway", "Sector 1 to 168", "Dadri"],
    latitude: 28.5355,
    longitude: 77.391,
    verified: true,
    verificationStatus: "verified",
    active: true,
    emergencyAvailable: true,
    availabilityStatus: "available",
    emergencyResponseEnabled: true,
    operatingHours: "24x7 Hospital & Ambulance",
    phone: "+91 98184 34479",
    alternatePhone: "+91 98184 34480",
    email: "pfanoida@gmail.com",
    website: "https://peopleforanimalsindia.org",
    address: "Animal Shelter, Near Mahamaya Flyover, Sector 94, Noida",
    members: [
      {
        userId: "system-ngo-pfa",
        role: "admin",
        name: "Kaveri Rana (President)",
      },
    ],
    stats: {
      casesResolved: 2340,
      activeRescues: 18,
    },
    createdAt: "2023-11-01T00:00:00.000Z",
    lastVerifiedAt: "2026-08-25T00:00:00.000Z",
  },
  {
    id: "org-wildlife-sos",
    name: "Wildlife SOS 24x7 Hotline",
    description: "Specialized wildlife rescue and conservation NGO handling urban human-wildlife conflict, birds, reptiles, monkeys, and wild animal distress.",
    logo: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=300",
    organizationType: "wildlife",
    city: "New Delhi",
    state: "Delhi",
    serviceAreas: ["Delhi NCR", "Noida", "Gurugram", "Faridabad", "Agra"],
    latitude: 28.6139,
    longitude: 77.209,
    verified: true,
    verificationStatus: "verified",
    active: true,
    emergencyAvailable: true,
    availabilityStatus: "available",
    emergencyResponseEnabled: true,
    operatingHours: "24x7 Emergency Wildlife Helpline",
    phone: "+91 98719 63535",
    email: "info@wildlifesos.org",
    website: "https://wildlifesos.org",
    address: "D-210, Defence Colony, New Delhi",
    members: [
      {
        userId: "system-ngo-wildlife",
        role: "coordinator",
        name: "Kartick Satyanarayan (Co-Founder)",
      },
    ],
    stats: {
      casesResolved: 3100,
      activeRescues: 8,
    },
    createdAt: "2023-09-01T00:00:00.000Z",
    lastVerifiedAt: "2026-08-10T00:00:00.000Z",
  },
  {
    id: "org-sgacc",
    name: "Sanjay Gandhi Animal Care Centre (SGACC)",
    description: "India's largest animal hospital and shelter with specialized avian OPD, equine treatment, trauma care, and cruelty intervention.",
    logo: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&q=80&w=300",
    organizationType: "shelter",
    city: "New Delhi",
    state: "Delhi",
    serviceAreas: ["Delhi NCR", "West Delhi", "North Delhi", "South Delhi"],
    latitude: 28.65,
    longitude: 77.12,
    verified: true,
    verificationStatus: "verified",
    active: true,
    emergencyAvailable: false,
    availabilityStatus: "limited",
    emergencyResponseEnabled: false,
    operatingHours: "9:30 AM - 5:30 PM (OPD & Admissions)",
    phone: "011-25448062",
    alternatePhone: "011-25447751",
    email: "sgacc1980@gmail.com",
    website: "https://sgacc.in",
    address: "Near Shivaji College, Raja Garden, New Delhi",
    members: [
      {
        userId: "system-ngo-sgacc",
        role: "vet",
        name: "Dr. Aniruddh Rao (Chief Vet)",
      },
    ],
    stats: {
      casesResolved: 4500,
      activeRescues: 5,
    },
    createdAt: "2023-08-01T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  },
  {
    id: "org-vet-firstaid-noida",
    name: "Veterinary First Aid & Trauma Support",
    description: "Mobile veterinary clinic offering on-demand on-site emergency treatment, saline, wound cleaning, and pain relief for road accident victims.",
    logo: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&q=80&w=300",
    organizationType: "veterinary",
    city: "Noida",
    state: "Uttar Pradesh",
    serviceAreas: ["Noida", "Greater Noida", "Sector 50 to 137"],
    latitude: 28.57,
    longitude: 77.36,
    verified: true,
    verificationStatus: "verified",
    active: true,
    emergencyAvailable: true,
    availabilityStatus: "available",
    emergencyResponseEnabled: true,
    operatingHours: "8:00 AM - 10:00 PM (Emergency Mobile Unit)",
    phone: "+91 99100 88221",
    email: "vetcare.noida@gmail.com",
    address: "Sector 62, Electronic City, Noida",
    members: [
      {
        userId: "system-ngo-vet",
        role: "vet",
        name: "Dr. Sneha Verma (MVSc Surgery)",
      },
    ],
    stats: {
      casesResolved: 320,
      activeRescues: 4,
    },
    createdAt: "2024-04-01T00:00:00.000Z",
    lastVerifiedAt: "2026-08-28T00:00:00.000Z",
  },
];

const DATA_DIR = path.resolve("src/data");
const ORGS_FILE = path.join(DATA_DIR, "organizations.json");

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(ORGS_FILE);
      const content = await fs.readFile(ORGS_FILE, "utf-8");
      const list = JSON.parse(content || "[]");
      if (list.length === 0) {
        await fs.writeFile(ORGS_FILE, JSON.stringify(DEFAULT_ORGANIZATIONS, null, 2), "utf-8");
      }
    } catch {
      await fs.writeFile(ORGS_FILE, JSON.stringify(DEFAULT_ORGANIZATIONS, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[OrganizationService] Failed to ensure directory/file exists:", err);
  }
}

export async function readOrganizations(): Promise<Organization[]> {
  await ensureFileExists();
  try {
    const content = await fs.readFile(ORGS_FILE, "utf-8");
    const list = JSON.parse(content || "[]");
    return list.length > 0 ? list : DEFAULT_ORGANIZATIONS;
  } catch (e) {
    return DEFAULT_ORGANIZATIONS;
  }
}

export async function writeOrganizations(orgs: Organization[]): Promise<void> {
  await ensureFileExists();
  await fs.writeFile(ORGS_FILE, JSON.stringify(orgs, null, 2), "utf-8");
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface GetOrganizationsQuery {
  search?: string | undefined;
  type?: string | undefined;
  state?: string | undefined;
  city?: string | undefined;
  emergencyOnly?: boolean | undefined;
  availableOnly?: boolean | undefined;
  userLat?: number | undefined;
  userLon?: number | undefined;
  includePending?: boolean | undefined;
}

export async function getOrganizations(query: GetOrganizationsQuery = {}): Promise<any[]> {
  const allOrgs = await readOrganizations();
  
  let filtered = allOrgs.filter((org) => {
    // Only verified & active organizations are shown to the public unless explicitly asked
    if (!query.includePending) {
      if (!org.verified || !org.active || org.verificationStatus !== "verified") {
        return false;
      }
    }

    if (query.type && query.type !== "all") {
      if (org.organizationType !== query.type) return false;
    }

    if (query.state && query.state !== "all") {
      if (org.state.toLowerCase() !== query.state.toLowerCase()) return false;
    }

    if (query.city && query.city !== "all") {
      if (org.city.toLowerCase() !== query.city.toLowerCase()) return false;
    }

    if (query.emergencyOnly) {
      if (!org.emergencyAvailable || !org.emergencyResponseEnabled) return false;
    }

    if (query.availableOnly) {
      if (org.availabilityStatus !== "available") return false;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.toLowerCase().trim();
      const matchName = org.name.toLowerCase().includes(s);
      const matchDesc = org.description.toLowerCase().includes(s);
      const matchCity = org.city.toLowerCase().includes(s);
      const matchArea = org.serviceAreas.some((a) => a.toLowerCase().includes(s));
      if (!matchName && !matchDesc && !matchCity && !matchArea) {
        return false;
      }
    }

    return true;
  });

  // Attach distance if user lat/lon provided
  let results = filtered.map((org) => {
    let distanceKm: number | undefined;
    if (
      query.userLat !== undefined &&
      query.userLon !== undefined &&
      org.latitude !== undefined &&
      org.longitude !== undefined
    ) {
      distanceKm = calculateDistanceKm(query.userLat, query.userLon, org.latitude, org.longitude);
    }
    return {
      ...org,
      distanceKm,
    };
  });

  // Sort by distance if available, otherwise by availability and cases resolved
  results.sort((a, b) => {
    if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
      return a.distanceKm - b.distanceKm;
    }
    if (a.availabilityStatus === "available" && b.availabilityStatus !== "available") return -1;
    if (b.availabilityStatus === "available" && a.availabilityStatus !== "available") return 1;
    return (b.stats?.casesResolved || 0) - (a.stats?.casesResolved || 0);
  });

  return results;
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const allOrgs = await readOrganizations();
  return allOrgs.find((o) => o.id === id) || null;
}

export async function registerOrganization(
  applicantUserId: string,
  applicantName: string,
  data: Partial<Organization>
): Promise<Organization> {
  const allOrgs = await readOrganizations();

  const newOrg: Organization = {
    id: `org-${crypto.randomUUID().substring(0, 8)}`,
    name: data.name || "Untitled Organization",
    description: data.description || "",
    logo: data.logo || "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=300",
    organizationType: data.organizationType || "rescue_ngo",
    city: data.city || "New Delhi",
    state: data.state || "Delhi",
    serviceAreas: data.serviceAreas && data.serviceAreas.length > 0 ? data.serviceAreas : [data.city || "Delhi NCR"],
    latitude: data.latitude,
    longitude: data.longitude,
    verified: false, // Strict: never automatically verified!
    verificationStatus: "pending",
    active: true,
    emergencyAvailable: Boolean(data.emergencyAvailable),
    availabilityStatus: "available",
    emergencyResponseEnabled: Boolean(data.emergencyResponseEnabled),
    operatingHours: data.operatingHours || "9:00 AM - 6:00 PM",
    phone: data.phone || "",
    alternatePhone: data.alternatePhone,
    email: data.email || "",
    website: data.website,
    address: data.address || "",
    members: [
      {
        userId: applicantUserId,
        role: "admin",
        name: applicantName,
      },
    ],
    stats: {
      casesResolved: 0,
      activeRescues: 0,
    },
    createdAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    supportingDocuments: data.supportingDocuments,
  };

  allOrgs.push(newOrg);
  await writeOrganizations(allOrgs);
  return newOrg;
}

export async function isUserAuthorizedMemberOfOrg(userId: string, orgId: string): Promise<boolean> {
  const org = await getOrganizationById(orgId);
  if (!org) return false;
  return org.members.some((m) => m.userId === userId);
}
