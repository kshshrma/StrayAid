import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface Sighting {
  id: string;
  reportId: string;
  reportedBy: string;
  latitude: number;
  longitude: number;
  address: string;
  dateTimeSeen: string;
  description: string;
  photoUrl?: string;
  createdAt: string;
}

const DATA_DIR = path.resolve("src/data");
const FILE_PATH = path.join(DATA_DIR, "sightings.json");

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(FILE_PATH);
    } catch {
      await fs.writeFile(FILE_PATH, JSON.stringify([]), "utf-8");
    }
  } catch (err) {
    console.error("[SightingService] Failed to ensure directory/file exists:", err);
  }
}

export async function readSightings(): Promise<Sighting[]> {
  await ensureFileExists();
  try {
    const content = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(content || "[]");
  } catch (e) {
    return [];
  }
}

export async function writeSightings(sightings: Sighting[]): Promise<void> {
  await ensureFileExists();
  await fs.writeFile(FILE_PATH, JSON.stringify(sightings, null, 2), "utf-8");
}

export async function createSighting(
  reportId: string,
  reportedBy: string,
  latitude: number,
  longitude: number,
  address: string,
  dateTimeSeen: string,
  description: string,
  photoUrl?: string
): Promise<Sighting> {
  const sightings = await readSightings();
  const newSighting: Sighting = {
    id: crypto.randomUUID(),
    reportId,
    reportedBy,
    latitude,
    longitude,
    address,
    dateTimeSeen,
    description,
    createdAt: new Date().toISOString(),
  };
  if (photoUrl) {
    newSighting.photoUrl = photoUrl;
  }
  sightings.push(newSighting);
  await writeSightings(sightings);
  return newSighting;
}

export async function getSightingsForReport(reportId: string): Promise<Sighting[]> {
  const sightings = await readSightings();
  return sightings
    .filter((s) => s.reportId === reportId)
    .sort((a, b) => new Date(a.dateTimeSeen).getTime() - new Date(b.dateTimeSeen).getTime());
}
