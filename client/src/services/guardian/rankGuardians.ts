import { findNearbyGuardians } from "./findNearbyGuardians";

export interface RankedGuardian {
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

  rank: number;
}

export async function rankGuardians(
  reportLatitude: number,
  reportLongitude: number,
  maxDistanceKm = 20
): Promise<RankedGuardian[]> {
  const nearbyGuardians =
    await findNearbyGuardians(
      reportLatitude,
      reportLongitude,
      maxDistanceKm
    );

  return nearbyGuardians.map(
    (guardian, index) => ({
      ...guardian,
      rank: index + 1,
    })
  );
}