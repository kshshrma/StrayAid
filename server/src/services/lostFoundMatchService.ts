import fs from "fs/promises";
import path from "path";
import { calculateDistanceKm } from "./dispatch";

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

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DISMISSED_FILE);
    } catch {
      await fs.writeFile(DISMISSED_FILE, JSON.stringify([]), "utf-8");
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
  } catch (e) {
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

// Check matching score between two reports
export function calculateMatchScore(reportA: any, reportB: any): number {
  // 1. Animal Type MUST match
  const typeA = (reportA.animal_type || "").toLowerCase();
  const typeB = (reportB.animal_type || "").toLowerCase();
  if (typeA !== typeB || !typeA) return 0;

  let score = 0;

  // Metadata Extraction
  let metaA: any = {};
  let metaB: any = {};
  try {
    metaA = JSON.parse(reportA.ai_advice || "{}");
    metaB = JSON.parse(reportB.ai_advice || "{}");
  } catch {}

  // 2. Breed (Max 25 pts)
  const breedA = (metaA.breed || "").toLowerCase();
  const breedB = (metaB.breed || "").toLowerCase();
  if (breedA && breedB) {
    if (breedA === breedB || breedA.includes(breedB) || breedB.includes(breedA)) {
      score += 25;
    } else if (
      breedA.includes("unknown") ||
      breedA.includes("mixed") ||
      breedB.includes("unknown") ||
      breedB.includes("mixed")
    ) {
      score += 10;
    }
  }

  // 3. Color (Max 25 pts)
  const colorA = (metaA.color || "").toLowerCase();
  const colorB = (metaB.color || "").toLowerCase();
  if (colorA && colorB) {
    if (colorA === colorB) {
      score += 25;
    } else {
      // Find overlapping color terms
      const colors = ["white", "black", "brown", "golden", "grey", "gray", "cream", "tan", "red", "spotted"];
      let overlap = false;
      for (const col of colors) {
        if (colorA.includes(col) && colorB.includes(col)) {
          overlap = true;
          break;
        }
      }
      if (overlap) score += 15;
    }
  }

  // 4. Location Proximity (Max 25 pts)
  if (
    reportA.latitude !== null &&
    reportA.longitude !== null &&
    reportB.latitude !== null &&
    reportB.longitude !== null
  ) {
    const distance = calculateDistanceKm(
      reportA.latitude,
      reportA.longitude,
      reportB.latitude,
      reportB.longitude
    );
    if (distance <= 2) {
      score += 25;
    } else if (distance <= 5) {
      score += 20;
    } else if (distance <= 15) {
      score += 10;
    } else if (distance <= 30) {
      score += 5;
    }
  }

  // 5. Date Proximity (Max 15 pts)
  const dateAStr = metaA.date || reportA.created_at;
  const dateBStr = metaB.date || reportB.created_at;
  if (dateAStr && dateBStr) {
    const dateA = new Date(dateAStr).getTime();
    const dateB = new Date(dateBStr).getTime();
    const deltaDays = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
    if (deltaDays <= 3) {
      score += 15;
    } else if (deltaDays <= 7) {
      score += 10;
    } else if (deltaDays <= 30) {
      score += 5;
    }
  }

  // 6. Collar & Name Match (Max 10 pts)
  const collarA = (metaA.collarColor || "").toLowerCase();
  const collarB = (metaB.collarColor || "").toLowerCase();
  if (collarA && collarB && (collarA === collarB || collarA.includes(collarB) || collarB.includes(collarA))) {
    score += 5;
  }

  const nameA = (metaA.name || "").toLowerCase();
  const nameB = (metaB.name || "").toLowerCase();
  if (nameA && nameB && nameA === nameB && !nameA.includes("unknown")) {
    score += 5;
  }

  return score;
}
