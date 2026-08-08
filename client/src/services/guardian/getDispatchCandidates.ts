import { findNearbyGuardians } from "./findNearbyGuardians";
import { calculateGuardianScore } from "./calculateGuardianScore";

export interface DispatchCandidate {
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

  dispatch_score: number;

  rank: number;
}

export async function getDispatchCandidates(
  reportLatitude: number,
  reportLongitude: number,
  maxDistanceKm = 20
): Promise<DispatchCandidate[]> {
  const guardians =
    await findNearbyGuardians(
      reportLatitude,
      reportLongitude,
      maxDistanceKm
    );

  const candidates = guardians.map(
    (guardian) => {
      const score =
        calculateGuardianScore({
          distance_km:
            guardian.distance_km,
          total_rescues:
            guardian.total_rescues,
        });

      return {
        ...guardian,
        dispatch_score: Number(
          score.toFixed(2)
        ),
      };
    }
  );

  candidates.sort(
    (a, b) =>
      b.dispatch_score -
      a.dispatch_score
  );

  return candidates.map(
    (candidate, index) => ({
      ...candidate,
      rank: index + 1,
    })
  );
}