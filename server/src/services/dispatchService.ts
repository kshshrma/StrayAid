import { getCaseById, transitionCaseStatus, logTimelineEvent } from "./caseService";
import { readVolunteers, type RescueVolunteerProfile } from "./volunteerService";
import { getApprovedNgos } from "./ngoService";

export interface RankedGuardianCandidate {
  userId: string;
  name: string;
  phone: string;
  distanceKm: number;
  distanceMeters: number;
  reliabilityScore: number;
  reliabilityLevel: "NEW" | "ACTIVE" | "TRUSTED" | "ELITE" | "HERO";
  dispatchScore: number;
  vehicle: string;
  speciesHandled: string[];
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusM = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusM * c);
}

/**
 * Calculates reliability score according to Section 9.1 formula
 * Score = (acceptance_rate * 0.35) + (completion_rate * 0.40) + (speed_score * 0.25)
 * DECEASED outcome does NOT lower score.
 */
export function calculateReliabilityScore(
  acceptanceRate = 95,
  completionRate = 90,
  speedScore = 85
): { score: number; level: "NEW" | "ACTIVE" | "TRUSTED" | "ELITE" | "HERO" } {
  const score = Math.round(
    acceptanceRate * 0.35 + completionRate * 0.4 + speedScore * 0.25
  );
  let level: "NEW" | "ACTIVE" | "TRUSTED" | "ELITE" | "HERO" = "NEW";
  if (score > 80) level = "HERO";
  else if (score > 60) level = "ELITE";
  else if (score > 40) level = "TRUSTED";
  else if (score > 20) level = "ACTIVE";

  return { score, level };
}

/**
 * Lists available guardians near lat/lng sorted by Section 9.1 ranking formula:
 * (gp.reliability_score * 0.4) + ((5000 - distance_m) / 5000 * 0.6)
 */
export async function getNearbyGuardians(
  lat: number,
  lng: number,
  radiusKm = 5,
  species?: string
): Promise<RankedGuardianCandidate[]> {
  const volunteers = await readVolunteers();
  const maxRadiusM = radiusKm * 1000;

  const candidates: RankedGuardianCandidate[] = [];

  for (const v of volunteers) {
    if (!v.emergencyAvailable && v.activeAssignmentsCount > 2) continue;
    if (species && !v.speciesHandled.includes(species.toLowerCase())) continue;

    const vLat = v.coordinates?.latitude ?? 28.5355;
    const vLng = v.coordinates?.longitude ?? 77.391;

    const distanceMeters = calculateDistanceMeters(lat, lng, vLat, vLng);
    if (distanceMeters > maxRadiusM) continue;

    const { score: reliabilityScore, level: reliabilityLevel } = calculateReliabilityScore();
    const distanceFactor = Math.max(0, (5000 - distanceMeters) / 5000);
    const dispatchScore = Math.round(
      (reliabilityScore * 0.4 + distanceFactor * 60) * 100
    ) / 100;

    candidates.push({
      userId: v.userId,
      name: v.name,
      phone: v.phone,
      distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
      distanceMeters,
      reliabilityScore,
      reliabilityLevel,
      dispatchScore,
      vehicle: v.vehicle,
      speciesHandled: v.speciesHandled,
    });
  }

  candidates.sort((a, b) => b.dispatchScore - a.dispatchScore);
  return candidates;
}

/**
 * Triggers 2-tier dispatch engine for case (Section 9.1)
 */
export async function dispatchCase(
  caseId: string,
  tier = 1
): Promise<{
  success: boolean;
  tier: number;
  notifiedCount: number;
  candidates?: any[];
  error?: string;
}> {
  const caseItem = await getCaseById(caseId);
  if (!caseItem) {
    return { success: false, tier, notifiedCount: 0, error: "Case not found" };
  }

  const lat = caseItem.coordinates?.latitude || 28.4721;
  const lng = caseItem.coordinates?.longitude || 77.5098;

  if (tier === 1) {
    const guardians = await getNearbyGuardians(lat, lng, 5, caseItem.animalType);
    const topGuardians = guardians.slice(0, 3);

    await logTimelineEvent({
      caseId,
      type: "CASE_DISPATCHED_TIER_1",
      actorId: "system",
      actorRole: "SYSTEM",
      actorName: "StrayAid Dispatch Engine",
      reason: `Dispatched to top ${topGuardians.length} nearest available Guardians (5km)`,
      metadata: { tier: 1, topGuardians },
    });

    return {
      success: true,
      tier: 1,
      notifiedCount: topGuardians.length,
      candidates: topGuardians,
    };
  }

  if (tier === 2) {
    const orgs = getApprovedNgos();
    await logTimelineEvent({
      caseId,
      type: "CASE_ESCALATED",
      actorId: "system",
      actorRole: "SYSTEM",
      actorName: "StrayAid Escalation Engine",
      reason: `Tier 2 Escalation: Broadcast to ${orgs.length} partner NGOs in service area`,
      metadata: { tier: 2, orgs: orgs.map((o) => o.name) },
    });

    return {
      success: true,
      tier: 2,
      notifiedCount: orgs.length,
      candidates: orgs,
    };
  }

  return { success: false, tier, notifiedCount: 0, error: "Invalid tier" };
}

/**
 * Guardian response (accept/decline)
 */
export async function handleGuardianDispatchResponse(
  caseId: string,
  guardianId: string,
  guardianName: string,
  accepted: boolean
): Promise<{ success: boolean; error?: string | undefined }> {
  if (accepted) {
    const res = await transitionCaseStatus(
      caseId,
      "VOLUNTEER_ASSIGNED",
      { actorId: guardianId, actorRole: "VOLUNTEER", actorName: guardianName },
      `Guardian ${guardianName} accepted the emergency rescue dispatch.`
    );
    return { success: res.success, error: res.error };
  } else {
    await logTimelineEvent({
      caseId,
      type: "GUARDIAN_DECLINED_DISPATCH",
      actorId: guardianId,
      actorRole: "VOLUNTEER",
      actorName: guardianName,
      reason: "Guardian unavailable to accept dispatch at this time",
    });
    return { success: true };
  }
}
