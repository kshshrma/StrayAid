import { supabase } from "../../lib/supabase";
import { uploadImage } from "../storage/uploadImage";
import type { LostFoundPet } from "../../features/lost-found/AnimalReportCard";

const MOCK_SEEDS = [
  {
    type: "lost",
    animal: "Dog",
    breed: "Golden Retriever",
    name: "Max",
    color: "Golden / Light Brown",
    collarColor: "Red collar with a brass tag",
    uniqueId: "Dark spot on left hind leg, floppy ears",
    location: "28.627311, 77.372545",
    address: "Near Block B Park, Sector 62, Noida",
    date: "2026-08-22",
    description: "Super friendly, responds to 'Max'. Went missing during evening walk.",
    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400",
    additionalInfo: "Microchipped, wearing a red collar. Please contact relay if seen.",
    contactNumber: "+91 98765 43210",
  },
  {
    type: "found",
    animal: "Cat",
    breed: "Persian Cat",
    color: "Fluffy White",
    uniqueId: "Blue eyes, bushy tail",
    location: "28.635901, 77.359211",
    address: "Staircase of Building C, Indirapuram, Ghaziabad",
    date: "2026-08-23",
    description: "Calm white Persian cat found resting. Safe with security.",
    image: "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?auto=format&fit=crop&q=80&w=400",
    additionalInfo: "No collar, very clean, likely a house pet.",
  },
  {
    type: "lost",
    animal: "Dog",
    breed: "Beagle",
    name: "Bella",
    color: "Tri-color (Black, Brown, White)",
    collarColor: "Blue nylon belt",
    uniqueId: "Brown spots on white stomach patches",
    location: "28.583210, 77.316890",
    address: "Near Sector 15 Metro Station, Noida",
    date: "2026-08-21",
    description: "Very energetic female Beagle. Friendly but easily scared by loud noises.",
    image: "https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&q=80&w=400",
    additionalInfo: "Answers to 'Bella'. Wearing a blue collar without tag.",
  },
];

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
    messages: [],
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
    reporterId: metadata.reporterId || "3e79170e-c511-4ad2-ad34-270992a73339",
    messages: metadata.messages || [],
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

  // Seed with initial mock reports if database returns 0 records
  if (!reports || reports.length === 0) {
    console.log("No Lost & Found reports in DB. Seeding initial mock data...");
    const seededList: LostFoundPet[] = [];
    
    for (const mock of MOCK_SEEDS) {
      const [latStr, lonStr] = mock.location.split(",");
      const latitude = parseFloat(latStr.trim()) || 0.0;
      const longitude = parseFloat(lonStr.trim()) || 0.0;

      const metadata = {
        breed: mock.breed,
        color: mock.color,
        collarColor: mock.collarColor,
        uniqueId: mock.uniqueId,
        name: mock.name,
        address: mock.address,
        date: mock.date,
        description: mock.description,
        additionalInfo: mock.additionalInfo,
        contactNumber: (mock as { contactNumber?: string }).contactNumber || "",
        reporterId: "3e79170e-c511-4ad2-ad34-270992a73339",
        messages: [],
      };

      const { data, error: insertError } = await supabase
        .from("reports")
        .insert([
          {
            image_url: mock.image,
            latitude,
            longitude,
            status: mock.type,
            animal_type: mock.animal,
            ai_advice: JSON.stringify(metadata),
          },
        ])
        .select()
        .single();

      if (!insertError && data) {
        seededList.push({
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
          reporterId: metadata.reporterId,
          messages: metadata.messages,
        });
      }
    }
    return seededList;
  }

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
    messages?: Array<{ senderId: string; senderName: string; text: string; timestamp: string }>;
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
      reporterId: metadata.reporterId || "3e79170e-c511-4ad2-ad34-270992a73339",
      messages: metadata.messages || [],
    };
  });
}


