import fs from "fs/promises";
import path from "path";
import { calculateDistanceKm } from "./dispatch";
import { createRescueCase, logTimelineEvent } from "./caseService";

export interface MatchResult {
  reportId: string;
  matchedReportId: string;
  score: number;
  breed: string;
  color: string;
  image: string;
  type: "lost" | "found";
  location: string;
  address: string;
  date: string;
}

export interface DismissedMatch {
  userId: string;
  reportId: string;
  matchedReportId: string;
  createdAt: string;
}

const DATA_DIR = path.resolve("src/data");
const DISMISSED_FILE = path.join(DATA_DIR, "dismissed_matches.json");
const LF_REPORTS_FILE = path.join(DATA_DIR, "lost_found_reports.json");

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DISMISSED_FILE);
    } catch {
      await fs.writeFile(DISMISSED_FILE, JSON.stringify([]), "utf-8");
    }
    try {
      await fs.access(LF_REPORTS_FILE);
    } catch {
      await fs.writeFile(LF_REPORTS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[MatchService] Failed to ensure directory/file exists:", err);
  }
}

export async function readDismissedMatches(): Promise<DismissedMatch[]> {
  await ensureFileExists();
  try {
    const content = await fs.readFile(DISMISSED_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch {
    return [];
  }
}

export async function writeDismissedMatches(matches: DismissedMatch[]): Promise<void> {
  await ensureFileExists();
  await fs.writeFile(DISMISSED_FILE, JSON.stringify(matches, null, 2), "utf-8");
}

export async function dismissMatch(
  userId: string,
  reportId: string,
  matchedReportId: string
): Promise<void> {
  const dismissals = await readDismissedMatches();
  const exists = dismissals.some(
    (d) =>
      d.userId === userId &&
      ((d.reportId === reportId && d.matchedReportId === matchedReportId) ||
        (d.reportId === matchedReportId && d.matchedReportId === reportId))
  );
  if (exists) return;

  dismissals.push({
    userId,
    reportId,
    matchedReportId,
    createdAt: new Date().toISOString(),
  });
  await writeDismissedMatches(dismissals);
}

/**
 * Calculates matching score between two reports (0 to 100)
 */
export function calculateMatchScore(reportA: any, reportB: any): number {
  const typeA = (reportA.animal_type || reportA.species || "").toLowerCase();
  const typeB = (reportB.animal_type || reportB.species || "").toLowerCase();
  if (typeA !== typeB || !typeA) return 0;

  let score = 0;

  let metaA: any = {};
  let metaB: any = {};
  try {
    metaA = typeof reportA.ai_advice === "string" ? JSON.parse(reportA.ai_advice || "{}") : (reportA.ai_advice || {});
    metaB = typeof reportB.ai_advice === "string" ? JSON.parse(reportB.ai_advice || "{}") : (reportB.ai_advice || {});
  } catch {}

  // 1. Breed Match (25 pts)
  const breedA = (reportA.breed || metaA.breed || "").toLowerCase();
  const breedB = (reportB.breed || metaB.breed || "").toLowerCase();
  if (breedA && breedB) {
    if (breedA === breedB || breedA.includes(breedB) || breedB.includes(breedA)) {
      score += 25;
    } else if (
      breedA.includes("indie") || breedA.includes("mixed") || breedA.includes("stray") ||
      breedB.includes("indie") || breedB.includes("mixed") || breedB.includes("stray")
    ) {
      score += 15;
    }
  }

  // 2. Color Match (25 pts)
  const colorA = (reportA.color || metaA.color || "").toLowerCase();
  const colorB = (reportB.color || metaB.color || "").toLowerCase();
  if (colorA && colorB) {
    if (colorA === colorB) {
      score += 25;
    } else {
      const colors = ["white", "black", "brown", "golden", "grey", "gray", "cream", "tan", "red", "spotted"];
      for (const col of colors) {
        if (colorA.includes(col) && colorB.includes(col)) {
          score += 15;
          break;
        }
      }
    }
  }

  // 3. Location Proximity (25 pts)
  const latA = reportA.latitude ?? reportA.location_lat;
  const lngA = reportA.longitude ?? reportA.location_lng;
  const latB = reportB.latitude ?? reportB.location_lat;
  const lngB = reportB.longitude ?? reportB.location_lng;

  if (latA !== undefined && lngA !== undefined && latB !== undefined && lngB !== undefined) {
    const distance = calculateDistanceKm(latA, lngA, latB, lngB);
    if (distance <= 2) score += 25;
    else if (distance <= 5) score += 20;
    else if (distance <= 10) score += 15;
    else if (distance <= 20) score += 5;
  }

  // 4. Date Proximity (15 pts)
  const dateA = new Date(reportA.created_at || Date.now()).getTime();
  const dateB = new Date(reportB.created_at || Date.now()).getTime();
  const deltaDays = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
  if (deltaDays <= 3) score += 15;
  else if (deltaDays <= 7) score += 10;
  else if (deltaDays <= 30) score += 5;

  // 5. Gender Match (10 pts)
  const sexA = (reportA.gender || reportA.sex || metaA.gender || "").toLowerCase();
  const sexB = (reportB.gender || reportB.sex || metaB.gender || "").toLowerCase();
  if (sexA && sexB && sexA === sexB && sexA !== "unknown") {
    score += 10;
  }

  return score;
}

/**
 * Async Match Check triggered on every new report insert (Section 12)
 * Evaluates active reports of the opposite type within 10 km
 */
export async function runAsyncMatchCheck(
  newReport: any,
  existingReports: any[]
): Promise<any[]> {
  const oppositeType = (newReport.report_type || newReport.type || "").toUpperCase() === "MISSING" ? "FOUND" : "MISSING";
  const newSpecies = (newReport.animal_type || newReport.species || "").toLowerCase();

  const candidates = existingReports.filter((r) => {
    const rType = (r.report_type || r.type || "").toUpperCase();
    const rSpecies = (r.animal_type || r.species || "").toLowerCase();
    const rStatus = (r.status || "ACTIVE").toUpperCase();

    return (
      rType === oppositeType &&
      rSpecies === newSpecies &&
      rStatus === "ACTIVE"
    );
  });

  const scored = candidates
    .map((c) => ({
      candidate: c,
      score: calculateMatchScore(newReport, c),
    }))
    .filter((item) => item.score >= 30)
    .sort((a, b) => b.score - a.score);

  return scored;
}

/**
 * 7-Day Welfare Pipeline Router (Section 12)
 * FOUND reports with no match after 7 days -> ROUTED_TO_WELFARE
 * Generates an active welfare rescue case for feeding/sheltering
 */
export async function routeStaleFoundReportsToWelfare(
  reports: any[]
): Promise<{ routedCount: number; routedReportIds: string[] }> {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const routedReportIds: string[] = [];

  for (const r of reports) {
    const rType = (r.report_type || r.type || "").toUpperCase();
    const rStatus = (r.status || "ACTIVE").toUpperCase();
    const createdAtTime = new Date(r.created_at || 0).getTime();

    if (rType === "FOUND" && rStatus === "ACTIVE" && createdAtTime < sevenDaysAgo) {
      r.status = "ROUTED_TO_WELFARE";
      routedReportIds.push(r.id);

      // Create a welfare rescue case
      const createdCase = await createRescueCase({
        reportId: r.id,
        animalType: r.animal_type || "dog",
        breed: r.breed || "Stray Animal",
        condition: "Stray animal found 7+ days ago — routed to welfare pipeline for feeding and shelter monitoring",
        priority: "normal",
        reporterId: r.reporter_id || "system",
        reporterName: r.reporter_name || "Community Reporter",
        exactLocation: r.address || r.location || "Community Location",
        coordinates: r.latitude && r.longitude ? { latitude: r.latitude, longitude: r.longitude } : undefined,
        photos: r.image ? [r.image] : [],
      });

      await logTimelineEvent({
        caseId: createdCase.caseId,
        type: "ROUTED_FROM_FOUND_REPORT",
        actorId: "system",
        actorRole: "SYSTEM",
        actorName: "Lost & Found Welfare Engine",
        reason: `Found report #${r.id} reached 7-day stale threshold. Routed to welfare case #${createdCase.caseNumber}`,
      });
    }
  }

  return { routedCount: routedReportIds.length, routedReportIds };
}
