import { supabase } from "../../lib/supabase";
import { calculateDistance } from "../../utils/distance";

interface NearbyGuardian {
  id: string;
  user_id: string;

  latitude: number;
  longitude: number;

  available: boolean;
  is_verified: boolean;

  total_rescues: number;

  bio: string | null;
  experience: string | null;

  distance_km: number;
}

export async function findNearbyGuardians(
  reportLatitude: number,
  reportLongitude: number,
  maxDistanceKm = 20
): Promise<NearbyGuardian[]> {
  const { data, error } = await supabase
    .from("guardians")
    .select("*")
    .eq("available", true)
    .eq("is_verified", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    throw error;
  }

  const guardians = (data || [])
    .map((guardian) => {
      const distance = calculateDistance(
        reportLatitude,
        reportLongitude,
        guardian.latitude,
        guardian.longitude
      );

      return {
        ...guardian,
        distance_km: Number(
          distance.toFixed(2)
        ),
      };
    })
    .filter(
      (guardian) =>
        guardian.distance_km <= maxDistanceKm
    )
    .sort(
      (a, b) =>
        a.distance_km - b.distance_km
    );

  return guardians;
}