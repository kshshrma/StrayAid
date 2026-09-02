export interface RegisteredNGO {
  id: string; // organizationId
  name: string;
  isVerified: boolean;
  availability: "available" | "busy" | "offline";
  location: string;
  categories: string[];
  description: string;
  phone: string;
  activeMembers: number;
  serviceArea: string;
  representativeUserId: string; // Authorized NGO member account
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

export const REGISTERED_NGOS: RegisteredNGO[] = [
  {
    id: "ngo-greater-noida-rescuers",
    name: "Greater Noida Rescuers",
    isVerified: true,
    availability: "available",
    location: "Greater Noida & Noida Sector 1–150",
    categories: ["Rescue", "Injured Animals", "Strays", "Emergency Transport"],
    description: "Active rescue and emergency medical assistance group for local Street Guardians in Greater Noida.",
    phone: "+91 98765 43210",
    activeMembers: 42,
    serviceArea: "Greater Noida, Noida-Greater Noida Expressway, Alpha, Beta, Delta & Knowledge Park",
    representativeUserId: "6c4c4175-c2c4-470b-a5d5-c86639f3e949",
    avatarUrl: null,
  },
  {
    id: "ngo-vet-first-aid",
    name: "Veterinary First Aid Support",
    isVerified: true,
    availability: "available",
    location: "Delhi NCR / Greater Noida",
    categories: ["First Aid Advice", "Emergency Triage", "Vaccination Guidance", "Prescription Consult"],
    description: "Direct chat with certified veterinarians and experienced triage volunteers for live advice.",
    phone: "+91 98765 43211",
    activeMembers: 18,
    serviceArea: "Delhi, Noida, Greater Noida, Ghaziabad & Gurgaon",
    representativeUserId: "a434a8d0-e23f-4388-8aac-fcd5fb38b2a6",
    avatarUrl: null,
  },
  {
    id: "ngo-coordination-hub",
    name: "NGO Coordination Hub",
    isVerified: true,
    availability: "available",
    location: "Noida & Greater Noida",
    categories: ["Shelter Placement", "Fostering", "Adoption Coordination", "Transport Fleet"],
    description: "Connecting local rescue groups with partner shelters to coordinate animal admission and transport.",
    phone: "+91 98765 43212",
    activeMembers: 27,
    serviceArea: "All major animal shelters in Noida & Greater Noida",
    representativeUserId: "c5344b2a-c1b9-4489-aaa4-1b478d11ae5d",
    avatarUrl: null,
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
