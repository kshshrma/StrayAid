import { supabase } from "../../lib/supabase";
import { uploadImage } from "../storage/uploadImage";
import type { LostFoundPet } from "../../features/lost-found/AnimalReportCard";

export async function saveLostFoundPet(
  pet: Omit<LostFoundPet, "id" | "date" | "image">,
  imageFile: File
): Promise<LostFoundPet> {
  // 1. Upload the image file to Supabase Storage
  const imageUrl = await uploadImage(imageFile);

  // 2. Parse coordinates from string e.g., "28.627311, 77.372545"
  const [latStr, lonStr] = pet.location.split(",");
  const latitude = parseFloat(latStr.trim()) || 0.0;
  const longitude = parseFloat(lonStr.trim()) || 0.0;

  const { data: { user } } = await supabase.auth.getUser();
  const reporterId = user?.id || "";

  // 3. Serialize metadata to JSON and store in ai_advice
  const metadata = {
    breed: pet.breed,
    color: pet.color,
    collarColor: pet.collarColor || "",
    uniqueId: pet.uniqueId || "",
    name: pet.name || "",
    address: pet.address || "",
    date: new Date().toISOString().split("T")[0],
    description: pet.description || "",
    additionalInfo: pet.additionalInfo || "",
    contactNumber: pet.contactNumber || "",
    reporterId,
  };

  const { data, error } = await supabase
    .from("reports")
    .insert([
      {
        image_url: imageUrl,
        latitude,
        longitude,
        status: pet.type, // "lost" or "found"
        animal_type: pet.animal,
        ai_advice: JSON.stringify(metadata),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Failed to insert Lost & Found report:", error);
    throw error;
  }

  return {
    id: data.id,
    type: data.status as "lost" | "found",
    animal: data.animal_type || "Other",
    breed: metadata.breed,
    color: metadata.color,
    collarColor: metadata.collarColor,
    uniqueId: metadata.uniqueId,
    location: `${data.latitude}, ${data.longitude}`,
    address: metadata.address,
    date: metadata.date,
    description: metadata.description,
    image: data.image_url || "",
    additionalInfo: metadata.additionalInfo,
    name: metadata.name,
    contactNumber: metadata.contactNumber,
    reporterId: metadata.reporterId || "6c4c4175-c2c4-470b-a5d5-c86639f3e949",
  };
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
  }

  return reports.map((row: { id: string; status: string; animal_type?: string; latitude: number; longitude: number; created_at?: string; image_url?: string; ai_advice?: string }) => {
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
    };
  });
}
