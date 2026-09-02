import fs from "fs/promises";
import path from "path";

export interface Helpline {
  id: string;
  name: string;
  category:
    | "emergency"
    | "veterinary"
    | "rescue"
    | "wildlife"
    | "cruelty"
    | "government"
    | "shelter"
    | "ambulance";
  phone: string;
  alternatePhone?: string | undefined;
  state: string;
  city: string;
  serviceArea: string;
  operatingHours: string;
  emergency: boolean;
  verifiedSource: string;
  sourceUrl?: string | undefined;
  active: boolean;
  lastVerifiedAt: string;
  notes?: string | undefined;
}

const DEFAULT_HELPLINES: Helpline[] = [
  {
    id: "hl-1962",
    name: "1962 — Animal & Veterinary Distress Shortcode",
    category: "government",
    phone: "1962",
    state: "All India (State-Dependent)",
    city: "National Service Code",
    serviceArea: "Available in selected States/UTs (e.g., Gujarat, Karnataka, MP, Telangana, AP, UP)",
    operatingHours: "24x7 / Daytime depending on State implementation",
    emergency: true,
    verifiedSource: "Government of India / Department of Animal Husbandry & Dairying",
    sourceUrl: "https://dahd.nic.in",
    active: true,
    lastVerifiedAt: "2026-08-20T00:00:00.000Z",
    notes: "Allocated as national emergency shortcode for Mobile Veterinary Units (MVU) and animal distress. Operational status varies by state government implementation.",
  },
  {
    id: "hl-delhi-govt",
    name: "Delhi Government 24x7 Animal Care Helpline",
    category: "government",
    phone: "011-23967555",
    state: "Delhi",
    city: "New Delhi",
    serviceArea: "All Districts of National Capital Territory of Delhi",
    operatingHours: "24x7 (Toll-Free / Direct Line)",
    emergency: true,
    verifiedSource: "Government of NCT of Delhi / Animal Husbandry Unit",
    sourceUrl: "https://delhi.gov.in",
    active: true,
    lastVerifiedAt: "2026-08-25T00:00:00.000Z",
    notes: "Official centralized helpline for reporting injured stray animals, cattle rescue, and emergency medical assistance in Delhi.",
  },
  {
    id: "hl-delhi-spca-1",
    name: "Delhi SPCA — Animal Cruelty & Distress Helpline",
    category: "cruelty",
    phone: "011-23965369",
    alternatePhone: "011-23972805",
    state: "Delhi",
    city: "New Delhi",
    serviceArea: "NCT of Delhi",
    operatingHours: "8:00 AM - 8:00 PM (Emergency Dispatch)",
    emergency: true,
    verifiedSource: "Delhi Society for the Prevention of Cruelty to Animals (Govt of Delhi)",
    sourceUrl: "https://delhi.gov.in",
    active: true,
    lastVerifiedAt: "2026-08-22T00:00:00.000Z",
    notes: "Listed by the Government of Delhi for reporting cruelty to animals, illegal breeding, abandoned pets, and rescue transport.",
  },
  {
    id: "hl-delhi-wildlife",
    name: "Delhi Forest & Wildlife Department (Green Helpline)",
    category: "wildlife",
    phone: "1800118600",
    state: "Delhi",
    city: "New Delhi",
    serviceArea: "All Delhi NCR Forest Divisions (Ridge, Asola, Yamuna Floodplains)",
    operatingHours: "24x7 Toll-Free Helpline",
    emergency: true,
    verifiedSource: "Department of Forests & Wildlife, Govt of NCT of Delhi",
    sourceUrl: "https://forest.delhigovt.nic.in",
    active: true,
    lastVerifiedAt: "2026-08-15T00:00:00.000Z",
    notes: "Official state hotline for rescuing snakes, monkeys, deer, nilgai, birds of prey, and wild animals in human habitations.",
  },
  {
    id: "hl-peta-india",
    name: "PETA India Emergency Animal Helpline",
    category: "emergency",
    phone: "+919820122602",
    state: "All India",
    city: "National Emergency Line",
    serviceArea: "All major Indian cities (Coordination with local rescue authorities)",
    operatingHours: "24x7 Emergency Assistance",
    emergency: true,
    verifiedSource: "PETA India Official Directory",
    sourceUrl: "https://petaindia.com",
    active: true,
    lastVerifiedAt: "2026-08-28T00:00:00.000Z",
    notes: "Emergency contact published by PETA India for animals in life-threatening situations, severe cruelty, and crisis rescue.",
  },
  {
    id: "hl-awbi",
    name: "Animal Welfare Board of India (AWBI)",
    category: "government",
    phone: "0129-2555700",
    state: "National / Haryana",
    city: "Faridabad / National",
    serviceArea: "National Animal Welfare Statutory Body",
    operatingHours: "9:30 AM - 6:00 PM (Monday to Friday)",
    emergency: false,
    verifiedSource: "Animal Welfare Board of India (Statutory Body under Ministry of Fisheries, Animal Husbandry & Dairying)",
    sourceUrl: "http://awbi.gov.in",
    active: true,
    lastVerifiedAt: "2026-08-10T00:00:00.000Z",
    notes: "National statutory authority regulating animal welfare organizations, SPCAs, and legal rights of community animals.",
  },
  {
    id: "hl-friendicoes-amb",
    name: "Friendicoes SECA Emergency Ambulance",
    category: "ambulance",
    phone: "011-24314982",
    alternatePhone: "011-24320707",
    state: "Delhi",
    city: "New Delhi / NCR",
    serviceArea: "Delhi NCR, South Delhi, Central Delhi, Noida",
    operatingHours: "24x7 Emergency Mobile Ambulance",
    emergency: true,
    verifiedSource: "Friendicoes SECA Official Hospital Roster",
    sourceUrl: "https://friendicoes.org",
    active: true,
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
    notes: "Mobile ambulance service for critically injured street dogs, cats, donkeys, and trauma victims.",
  },
  {
    id: "hl-pfa-noida",
    name: "PFA Noida Animal Emergency Ambulance",
    category: "rescue",
    phone: "+919818434479",
    alternatePhone: "+919818434480",
    state: "Uttar Pradesh",
    city: "Noida",
    serviceArea: "Noida, Greater Noida, Sector 1 to 168",
    operatingHours: "24x7 Ambulance & Hospital Admissions",
    emergency: true,
    verifiedSource: "People For Animals Noida (Sector 94 Animal Hospital)",
    sourceUrl: "https://peopleforanimalsindia.org",
    active: true,
    lastVerifiedAt: "2026-08-25T00:00:00.000Z",
    notes: "Official rescue service for street animals in Gautam Buddha Nagar / Noida district.",
  },
  {
    id: "hl-wildlife-sos",
    name: "Wildlife SOS 24x7 Emergency Helpline",
    category: "wildlife",
    phone: "+919871963535",
    state: "Delhi",
    city: "Delhi NCR",
    serviceArea: "Delhi, Noida, Gurugram, Ghaziabad, Faridabad, Agra",
    operatingHours: "24x7 Emergency Wildlife Helpline",
    emergency: true,
    verifiedSource: "Wildlife SOS Official Wildlife Rescue Division",
    sourceUrl: "https://wildlifesos.org",
    active: true,
    lastVerifiedAt: "2026-08-20T00:00:00.000Z",
    notes: "Specialized team for wild animal rescue, snake capture, injured raptors, and nilgai collisions.",
  },
  {
    id: "hl-noida-shelter",
    name: "Noida Authority Animal Care Shelter (Sector 94)",
    category: "shelter",
    phone: "+919999690890",
    state: "Uttar Pradesh",
    city: "Noida",
    serviceArea: "Noida City",
    operatingHours: "9:00 AM - 6:00 PM (Emergency 24x7)",
    emergency: true,
    verifiedSource: "Noida Industrial Development Authority (Health & Animal Division)",
    sourceUrl: "https://noidaauthorityonline.in",
    active: true,
    lastVerifiedAt: "2026-08-15T00:00:00.000Z",
    notes: "Noida Authority shelter for sick, injured, and abandoned domestic & street animals.",
  },
  {
    id: "hl-bsapc-mumbai",
    name: "Bombay SPCA & Bai Sakarbai Hospital",
    category: "veterinary",
    phone: "022-24137518",
    alternatePhone: "022-24135285",
    state: "Maharashtra",
    city: "Mumbai",
    serviceArea: "Mumbai, Suburban Mumbai, Thane",
    operatingHours: "24x7 Hospital & Ambulance",
    emergency: true,
    verifiedSource: "Bombay SPCA Official Roster (Parel)",
    sourceUrl: "https://bombayspca.org",
    active: true,
    lastVerifiedAt: "2026-08-12T00:00:00.000Z",
    notes: "24x7 veterinary hospital with ambulance fleet for Mumbai street animals and pets.",
  },
  {
    id: "hl-cupa-blr",
    name: "CUPA Bengaluru Animal Trauma & Rescue",
    category: "rescue",
    phone: "080-22947307",
    alternatePhone: "080-22947300",
    state: "Karnataka",
    city: "Bengaluru",
    serviceArea: "Bengaluru Urban & Rural",
    operatingHours: "9:00 AM - 6:00 PM (Emergency Dispatch)",
    emergency: true,
    verifiedSource: "Compassion Unlimited Plus Action (CUPA) Official",
    sourceUrl: "https://cupabangalore.org",
    active: true,
    lastVerifiedAt: "2026-08-14T00:00:00.000Z",
    notes: "Trauma hospital, large animal rescue, wildlife rehabilitation, and cruelty reporting in Bengaluru.",
  },
];

const DATA_DIR = path.resolve("src/data");
const HELPLINES_FILE = path.join(DATA_DIR, "helplines.json");

// Confirmed states where 1962 is officially operational with dedicated Mobile Veterinary Units (MVU)
const CONFIRMED_1962_STATES = [
  "gujarat",
  "karnataka",
  "madhya pradesh",
  "telangana",
  "andhra pradesh",
  "uttar pradesh",
  "tamil nadu",
  "odisha",
  "rajasthan",
  "haryana",
];

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(HELPLINES_FILE);
      const content = await fs.readFile(HELPLINES_FILE, "utf-8");
      const list = JSON.parse(content || "[]");
      if (list.length === 0) {
        await fs.writeFile(HELPLINES_FILE, JSON.stringify(DEFAULT_HELPLINES, null, 2), "utf-8");
      }
    } catch {
      await fs.writeFile(HELPLINES_FILE, JSON.stringify(DEFAULT_HELPLINES, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[HelplineService] Failed to ensure directory/file exists:", err);
  }
}

export async function readHelplines(): Promise<Helpline[]> {
  await ensureFileExists();
  try {
    const content = await fs.readFile(HELPLINES_FILE, "utf-8");
    const list = JSON.parse(content || "[]");
    return list.length > 0 ? list : DEFAULT_HELPLINES;
  } catch (e) {
    return DEFAULT_HELPLINES;
  }
}

export interface GetHelplinesQuery {
  search?: string | undefined;
  category?: string | undefined;
  state?: string | undefined;
  city?: string | undefined;
  emergencyOnly?: boolean | undefined;
}

export async function getHelplines(query: GetHelplinesQuery = {}): Promise<{
  helplines: Helpline[];
  state1962Status: {
    state: string;
    isConfirmed: boolean;
    message: string;
  };
}> {
  const all = await readHelplines();

  let filtered = all.filter((item) => {
    if (!item.active) return false;

    if (query.category && query.category !== "all") {
      if (item.category !== query.category) return false;
    }

    if (query.state && query.state !== "all") {
      const qState = query.state.toLowerCase();
      const isMatch =
        item.state.toLowerCase() === qState ||
        item.state.toLowerCase().includes("all india") ||
        item.state.toLowerCase().includes("national");
      if (!isMatch) return false;
    }

    if (query.city && query.city !== "all") {
      const qCity = query.city.toLowerCase();
      const isMatch =
        item.city.toLowerCase().includes(qCity) ||
        item.serviceArea.toLowerCase().includes(qCity) ||
        item.state.toLowerCase().includes("all india") ||
        item.state.toLowerCase().includes("national");
      if (!isMatch) return false;
    }

    if (query.emergencyOnly) {
      if (!item.emergency) return false;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(s);
      const matchArea = item.serviceArea.toLowerCase().includes(s);
      const matchCity = item.city.toLowerCase().includes(s);
      const matchSource = item.verifiedSource.toLowerCase().includes(s);
      const matchPhone = item.phone.includes(s) || (item.alternatePhone && item.alternatePhone.includes(s));
      if (!matchName && !matchArea && !matchCity && !matchSource && !matchPhone) {
        return false;
      }
    }

    return true;
  });

  // Evaluate 1962 state status
  const selectedState = query.state && query.state !== "all" ? query.state.toLowerCase() : "all";
  const is1962Confirmed = selectedState === "all" ? true : CONFIRMED_1962_STATES.includes(selectedState);

  const state1962Message =
    selectedState === "all"
      ? "1962 is an official national animal-distress / mobile veterinary shortcode. Operational status and ambulance dispatch availability depends on state government rollout."
      : is1962Confirmed
      ? `✓ 1962 is confirmed operational in ${query.state} under the State Mobile Veterinary Unit initiative.`
      : `Availability of 1962 in ${query.state} may vary by local district. Direct local NGO/hospital numbers are recommended for immediate response.`;

  return {
    helplines: filtered,
    state1962Status: {
      state: query.state || "All India",
      isConfirmed: is1962Confirmed,
      message: state1962Message,
    },
  };
}
