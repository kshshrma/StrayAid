import { supabase } from "../../lib/supabase";
import { uploadImage } from "../storage/uploadImage";
import type { LostFoundPet } from "../../features/lost-found/AnimalReportCard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("User not authenticated");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function saveLostFoundPet(
  pet: Omit<LostFoundPet, "id" | "date" | "image"> & { urgency?: string },
  imageFile: File
): Promise<LostFoundPet> {
  // 1. Upload the image file to Supabase Storage first
  const imageUrl = await uploadImage(imageFile);

  // 2. Call backend API to create the report
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/reports/lost-found`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: pet.type,
      animal: pet.animal,
      breed: pet.breed,
      color: pet.color,
      location: pet.location,
      description: pet.description,
      photoUrl: imageUrl,
      uniqueId: pet.uniqueId,
      collarColor: pet.collarColor,
      name: pet.name,
      address: pet.address,
      date: pet.date,
      additionalInfo: pet.additionalInfo,
      urgency: pet.urgency || "Normal",
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to create lost/found report");
  }

  return result.report;
}

export async function getLostFoundPets(): Promise<LostFoundPet[]> {
  const { data: reports, error } = await supabase
    .from("reports")
    .select("*")
    .in("status", ["lost", "found"]);

  if (error) {
    console.error("Failed to retrieve Lost & Found reports:", error);
    throw error;
  }

  if (!reports) return [];

  interface PetMetadata {
    breed?: string;
    color?: string;
    collarColor?: string;
    uniqueId?: string;
    name?: string;
    address?: string;
    date?: string;
    description?: string;
    additionalInfo?: string;
    contactNumber?: string;
    reporterId?: string;
    urgency?: string;
    reunited?: boolean;
    reunionPhotoUrl?: string;
    reunitedAt?: string;
    messages?: Array<{ senderId: string; senderName: string; text: string; timestamp: string }>;
  }

  return reports.map((row: any) => {
    let metadata: PetMetadata = {};
    try {
      metadata = JSON.parse(row.ai_advice || "{}");
    } catch (e) {
      console.warn("Failed to parse ai_advice for Lost & Found item:", row.id, e);
    }

    return {
      id: row.id,
      type: row.status as "lost" | "found",
      animal: row.animal_type || "Other",
      breed: metadata.breed || "",
      color: metadata.color || "",
      collarColor: metadata.collarColor || "",
      uniqueId: metadata.uniqueId || "",
      location: `${row.latitude}, ${row.longitude}`,
      address: metadata.address || "",
      date: metadata.date || (row.created_at ? row.created_at.split("T")[0] : ""),
      description: metadata.description || "",
      image: row.image_url || "",
      additionalInfo: metadata.additionalInfo || "",
      name: metadata.name || "",
      contactNumber: metadata.contactNumber || "",
      reporterId: metadata.reporterId || "6c4c4175-c2c4-470b-a5d5-c86639f3e949",
      urgency: metadata.urgency || "Normal",
      reunited: metadata.reunited || false,
      reunionPhotoUrl: metadata.reunionPhotoUrl || "",
      reunitedAt: metadata.reunitedAt || "",
      messages: metadata.messages || [],
    };
  });
}

// Fetch all reports (active and reunited) for a specific user's history
export async function getLostFoundPetsForUser(userId: string): Promise<LostFoundPet[]> {
  const { data: reports, error } = await supabase
    .from("reports")
    .select("*");

  if (error) throw error;
  if (!reports) return [];

  return reports
    .map((row: any) => {
      let metadata: any = {};
      try {
        metadata = JSON.parse(row.ai_advice || "{}");
      } catch {}

      return {
        id: row.id,
        type: (row.status === "reunited" ? metadata.originalType : row.status) as "lost" | "found",
        animal: reportTypeToAnimal(row.animal_type),
        breed: metadata.breed || "",
        color: metadata.color || "",
        collarColor: metadata.collarColor || "",
        uniqueId: metadata.uniqueId || "",
        location: `${row.latitude}, ${row.longitude}`,
        address: metadata.address || "",
        date: metadata.date || "",
        description: metadata.description || "",
        image: row.image_url || "",
        additionalInfo: metadata.additionalInfo || "",
        name: metadata.name || "",
        reporterId: metadata.reporterId || "",
        urgency: metadata.urgency || "Normal",
        reunited: metadata.reunited || (row.status === "reunited"),
        reunionPhotoUrl: metadata.reunionPhotoUrl || "",
        reunitedAt: metadata.reunitedAt || "",
        messages: metadata.messages || [],
      };
    })
    .filter((p: any) => p.reporterId === userId);
}

function reportTypeToAnimal(type: string): string {
  return type || "Other";
}

// Backend wrappers for sightings
export async function submitSightingOnBackend(
  reportId: string,
  data: {
    latitude: string;
    longitude: string;
    address?: string;
    dateTimeSeen: string;
    description?: string;
  },
  imageFile?: File
) {
  let photoUrl = "";
  if (imageFile) {
    photoUrl = await uploadImage(imageFile);
  }

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/reports/${reportId}/sightings`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...data,
      photoUrl,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to submit sighting");
  }
  return result.sighting;
}

export async function getSightingsFromBackend(reportId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/reports/${reportId}/sightings`, {
    method: "GET",
    headers,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch sightings");
  }
  return result.sightings || [];
}

// Backend wrappers for potential matching
export async function getMatchesFromBackend(reportId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/reports/${reportId}/matches`, {
    method: "GET",
    headers,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch matches");
  }
  return result.matches || [];
}

export async function dismissMatchOnBackend(reportId: string, matchId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/reports/${reportId}/matches/${matchId}/dismiss`, {
    method: "POST",
    headers,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to dismiss match");
  }
  return result;
}

// Mark reunited wrapper
export async function markReunitedOnBackend(reportId: string, reunionPhotoFile?: File) {
  let photoUrl = "";
  if (reunionPhotoFile) {
    photoUrl = await uploadImage(reunionPhotoFile);
  }

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/reports/${reportId}/reunited`, {
    method: "POST",
    headers,
    body: JSON.stringify({ photoUrl }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to mark as reunited");
  }
  return result;
}

export async function getLostFoundPetById(reportId: string): Promise<LostFoundPet | null> {
  const { data: row, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error || !row) {
    return null;
  }

  let metadata: any = {};
  try {
    metadata = JSON.parse(row.ai_advice || "{}");
  } catch (e) {}

  return {
    id: row.id,
    type: (row.status === "reunited" ? (metadata.originalType || "lost") : row.status) as "lost" | "found",
    animal: row.animal_type || "Other",
    breed: metadata.breed || "",
    color: metadata.color || "",
    collarColor: metadata.collarColor || "",
    uniqueId: metadata.uniqueId || "",
    location: `${row.latitude}, ${row.longitude}`,
    address: metadata.address || "",
    date: metadata.date || (row.created_at ? row.created_at.split("T")[0] : ""),
    description: metadata.description || "",
    image: row.image_url || "",
    additionalInfo: metadata.additionalInfo || "",
    name: metadata.name || "",
    contactNumber: metadata.contactNumber || "",
    reporterId: metadata.reporterId || "6c4c4175-c2c4-470b-a5d5-c86639f3e949",
    urgency: metadata.urgency || "Normal",
    reunited: metadata.reunited || (row.status === "reunited"),
    reunionPhotoUrl: metadata.reunionPhotoUrl || "",
    reunitedAt: metadata.reunitedAt || "",
  };
}
