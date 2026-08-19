import { supabase } from "./supabase";

interface Guardian {
  id: string;
  user_id: string;

  latitude: number | null;
  longitude: number | null;

  available: boolean;
  is_verified: boolean;

  total_rescues: number;
}

interface RankedGuardian extends Guardian {
  distance_km: number;
  dispatch_score: number;
}

/**
 * Calculate distance between two GPS coordinates.
 * Returns distance in kilometers.
 */
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

/**
 * Calculate Guardian dispatch score.
 *
 * Distance:
 * 100 - distance × 5
 *
 * Experience:
 * total rescues × 2
 * maximum 20
 */
function calculateDispatchScore(
  distanceKm: number,
  totalRescues: number
): number {
  const distanceScore = Math.max(
    0,
    100 - distanceKm * 5
  );

  const experienceScore = Math.min(
    totalRescues * 2,
    20
  );

  return (
    distanceScore +
    experienceScore
  );
}

/**
 * Find the best Guardian for a report.
 *
 * Only:
 * - available Guardians
 * - verified Guardians
 * - Guardians with valid GPS
 *
 * within maxDistanceKm are considered.
 */
export async function findBestGuardian(
  reportLatitude: number,
  reportLongitude: number,
  maxDistanceKm = 20
): Promise<RankedGuardian | null> {
  const {
    data: guardians,
    error,
  } = await supabase
    .from("guardians")
    .select(`
      id,
      user_id,
      latitude,
      longitude,
      available,
      is_verified,
      total_rescues
    `)
    .eq("available", true)
    .eq("is_verified", true);

  if (error) {
    throw error;
  }

  if (!guardians || guardians.length === 0) {
    return null;
  }

  const rankedGuardians: RankedGuardian[] =
    guardians
      .filter(
        (guardian: Guardian) =>
          guardian.latitude !== null &&
          guardian.longitude !== null
      )
      .map(
        (guardian: Guardian) => {
          const distanceKm =
            calculateDistanceKm(
              reportLatitude,
              reportLongitude,
              guardian.latitude!,
              guardian.longitude!
            );

          const dispatchScore =
            calculateDispatchScore(
              distanceKm,
              guardian.total_rescues ?? 0
            );

          return {
            ...guardian,
            distance_km:
              Number(distanceKm.toFixed(2)),
            dispatch_score:
              Number(
                dispatchScore.toFixed(2)
              ),
          };
        }
      )
      .filter(
        (guardian) =>
          guardian.distance_km <=
          maxDistanceKm
      )
      .sort(
        (a, b) =>
          b.dispatch_score -
          a.dispatch_score
      );

  return (
    rankedGuardians[0] ?? null
  );
}

/**
 * Automatically assign a report
 * to the best available Guardian.
 */
export async function dispatchReport(
  reportId: string,
  latitude: number,
  longitude: number
) {
  const guardian =
    await findBestGuardian(
      latitude,
      longitude
    );

  if (!guardian) {
    console.log(
      "No suitable Guardian found for report:",
      reportId
    );

    return null;
  }

  const {
    data: existingAssignment,
    error: existingError,
  } = await supabase
    .from("rescue_assignments")
    .select("id")
    .eq("report_id", reportId)
    .eq(
      "guardian_id",
      guardian.id
    )
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingAssignment) {
    console.log(
      "Guardian already assigned:",
      existingAssignment.id
    );

    return existingAssignment;
  }

  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("rescue_assignments")
    .insert({
      report_id: reportId,

      guardian_id:
        guardian.id,

      distance_km:
        guardian.distance_km,

      dispatch_score:
        guardian.dispatch_score,

      status: "pending",
    })
    .select()
    .single();

  if (assignmentError) {
    throw assignmentError;
  }

  console.log(
    "Guardian dispatched successfully:",
    {
      reportId,
      guardianId: guardian.id,
      distanceKm:
        guardian.distance_km,
      dispatchScore:
        guardian.dispatch_score,
    }
  );

  return assignment;
}