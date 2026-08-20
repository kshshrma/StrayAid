import { supabase } from "./supabase";

interface Guardian {
  id: string;
  user_id: string;

  latitude: number | null;
  longitude: number | null;

  available: boolean;
  is_verified: boolean;

  total_rescues: number;
  last_active: string | null;
}

interface RankedGuardian extends Guardian {
  distance_km: number;
  distance_score: number;
  experience_score: number;
  availability_score: number;
  fairness_score: number;
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

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

// Severity weight matrices
const WEIGHTS = {
  LowMedium: {
    distance: 0.45,
    fairness: 0.30,
    availability: 0.15,
    experience: 0.10,
  },
  High: {
    distance: 0.45,
    fairness: 0.20,
    availability: 0.10,
    experience: 0.25,
  },
  Critical: {
    distance: 0.35,
    fairness: 0.10,
    availability: 0.15,
    experience: 0.40,
  },
};

/**
 * Find the best eligible Guardian for a report.
 * Filters out Guardians who have already been assigned to this report.
 */
export async function findBestGuardian(
  reportId: string,
  reportLatitude: number,
  reportLongitude: number,
  severity: string,
  maxDistanceKm = 20
): Promise<RankedGuardian | null> {
  // Fetch existing assignments for this report to exclude candidates
  const { data: reportAssignments, error: reportAssignmentsError } = await supabase
    .from("rescue_assignments")
    .select("guardian_id")
    .eq("report_id", reportId);

  if (reportAssignmentsError) {
    console.error("[Dispatch] Error fetching previous assignments:", reportAssignmentsError);
  }

  const excludedGuardianIds = new Set<string>();
  if (reportAssignments) {
    for (const assignment of reportAssignments) {
      if (assignment.guardian_id) {
        excludedGuardianIds.add(assignment.guardian_id);
      }
    }
  }

  // Fetch all available and verified guardians
  const { data: guardians, error } = await supabase
    .from("guardians")
    .select("id, user_id, latitude, longitude, available, is_verified, total_rescues, last_active")
    .eq("available", true)
    .eq("is_verified", true);

  if (error) {
    throw error;
  }

  if (!guardians || guardians.length === 0) {
    return null;
  }

  // Fetch recent assignments in the last 24 hours to calculate fairness scores
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentAssignments, error: recentError } = await supabase
    .from("rescue_assignments")
    .select("guardian_id")
    .gte("created_at", oneDayAgo);

  if (recentError) {
    console.error("[Dispatch] Error fetching recent assignments:", recentError);
  }

  const assignmentCounts = new Map<string, number>();
  if (recentAssignments) {
    for (const assoc of recentAssignments) {
      if (assoc.guardian_id) {
        assignmentCounts.set(
          assoc.guardian_id,
          (assignmentCounts.get(assoc.guardian_id) ?? 0) + 1
        );
      }
    }
  }

  // Determine weights based on severity
  let weights = WEIGHTS.LowMedium;
  if (severity === "High") {
    weights = WEIGHTS.High;
  } else if (severity === "Critical") {
    weights = WEIGHTS.Critical;
  }

  const nowTime = Date.now();
  const rankedGuardians: RankedGuardian[] = [];

  for (const guardian of guardians) {
    // Validate GPS and exclusion list
    if (guardian.latitude === null || guardian.longitude === null) continue;
    if (excludedGuardianIds.has(guardian.id)) continue;

    const distanceKm = calculateDistanceKm(
      reportLatitude,
      reportLongitude,
      guardian.latitude,
      guardian.longitude
    );

    if (distanceKm > maxDistanceKm) continue;

    // 1. Distance Score
    const distanceScore = Math.max(0, 100 - distanceKm * 5);

    // 2. Experience Score
    const experienceScore = Math.min((guardian.total_rescues ?? 0) * 5, 100);

    // 3. Availability Score (based on last_active latency)
    let availabilityScore = 0;
    if (guardian.last_active) {
      const lastActiveTime = new Date(guardian.last_active).getTime();
      const hoursSinceActive = Math.max(0, (nowTime - lastActiveTime) / (3600 * 1000));
      availabilityScore = Math.max(0, 100 - hoursSinceActive * 5);
    }

    // 4. Fairness Score (penalize if assigned recently)
    const recentCount = assignmentCounts.get(guardian.id) ?? 0;
    const fairnessScore = Math.max(0, 100 - recentCount * 25);

    // Calculate final weighted score
    const dispatchScore =
      distanceScore * weights.distance +
      experienceScore * weights.experience +
      availabilityScore * weights.availability +
      fairnessScore * weights.fairness;

    rankedGuardians.push({
      ...guardian,
      distance_km: Number(distanceKm.toFixed(2)),
      distance_score: Number(distanceScore.toFixed(2)),
      experience_score: Number(experienceScore.toFixed(2)),
      availability_score: Number(availabilityScore.toFixed(2)),
      fairness_score: Number(fairnessScore.toFixed(2)),
      dispatch_score: Number(dispatchScore.toFixed(2)),
    });
  }

  if (rankedGuardians.length === 0) {
    return null;
  }

  // Sort descending by final dispatch score
  rankedGuardians.sort((a, b) => b.dispatch_score - a.dispatch_score);

  return rankedGuardians[0] ?? null;
}

/**
 * Automatically assign a report to the best eligible Guardian.
 */
export async function dispatchReport(
  reportId: string,
  latitude: number,
  longitude: number,
  severity: string
) {
  const guardian = await findBestGuardian(
    reportId,
    latitude,
    longitude,
    severity
  );

  if (!guardian) {
    console.log(`[Dispatch] No suitable Guardian found for report ${reportId}`);
    return null;
  }

  // Expiration set to 1 minute from now
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

  const { data: assignment, error: assignmentError } = await supabase
    .from("rescue_assignments")
    .insert({
      report_id: reportId,
      guardian_id: guardian.id,
      distance_km: guardian.distance_km,
      dispatch_score: guardian.dispatch_score,
      status: "pending",
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (assignmentError) {
    if (assignmentError.code === "23505") {
      console.log(`[Dispatch] Guardian ${guardian.id} already assigned to report ${reportId}`);
      return null;
    }
    throw assignmentError;
  }

  console.log(`[Dispatch] Guardian ${guardian.id} assigned to report ${reportId} with score ${guardian.dispatch_score}`);
  return assignment;
}