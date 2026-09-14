import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { createRescueCase, readCases, transitionCaseStatus, CaseStatus } from "../services/caseService";
import { calculateDistanceMeters } from "../services/dispatchService";

export interface PendingReportItem {
  localId: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | undefined;
  notes?: string | undefined;
  animalType?: "dog" | "cat" | "other" | undefined;
  createdAt: string;
}

export interface PendingStatusUpdateItem {
  localId: string;
  caseId: string;
  newStatus: CaseStatus;
  note?: string | undefined;
  createdAt: string;
}

/**
 * POST /api/v1/sync/reports - Batch upload offline-queued reports (Section 7.3)
 */
export async function syncReportsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId || "offline-reporter";
    const { reports } = req.body;

    if (!Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({ success: false, message: "Reports array is required" });
    }

    const existingCases = await readCases();
    const synced: Array<{ localId: string; serverId: string; status: string; caseNumber: string }> = [];
    const failed: Array<{ localId: string; error: string }> = [];

    for (const item of reports as PendingReportItem[]) {
      try {
        if (!item.latitude || !item.longitude) {
          failed.push({ localId: item.localId, error: "Missing latitude/longitude" });
          continue;
        }

        // Duplicate check rule: within 100m in the last 30 minutes
        const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
        const isDuplicate = existingCases.some((c) => {
          if (!c.coordinates) return false;
          const caseTime = new Date(c.createdAt).getTime();
          if (caseTime < thirtyMinAgo) return false;

          const distM = calculateDistanceMeters(
            item.latitude,
            item.longitude,
            c.coordinates.latitude,
            c.coordinates.longitude
          );
          return distM <= 100;
        });

        if (isDuplicate) {
          failed.push({ localId: item.localId, error: "Duplicate report within 100m in last 30min" });
          continue;
        }

        const newCase = await createRescueCase({
          animalType: item.animalType || "dog",
          condition: item.notes || "Offline field rescue report",
          priority: "urgent",
          reporterId: userId,
          reporterName: "Field Rescuer (Offline Sync)",
          exactLocation: `GPS Location (${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)})`,
          coordinates: { latitude: item.latitude, longitude: item.longitude },
          photos: item.photoUrl ? [item.photoUrl] : [],
        });

        synced.push({
          localId: item.localId,
          serverId: newCase.caseId,
          caseNumber: newCase.caseNumber,
          status: "CREATED",
        });
      } catch (err: any) {
        failed.push({ localId: item.localId, error: err?.message || "Creation failed" });
      }
    }

    return res.json({
      success: failed.length === 0,
      synced,
      failed,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Batch report sync failed" });
  }
}

/**
 * POST /api/v1/sync/status-updates - Batch upload offline-queued status taps (Section 7.3)
 */
export async function syncStatusUpdatesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId || "offline-rescuer";
    const { statusUpdates } = req.body;

    if (!Array.isArray(statusUpdates) || statusUpdates.length === 0) {
      return res.status(400).json({ success: false, message: "statusUpdates array is required" });
    }

    const synced: Array<{ localId: string; caseId: string; status: string }> = [];
    const failed: Array<{ localId: string; error: string }> = [];

    for (const update of statusUpdates as PendingStatusUpdateItem[]) {
      try {
        const result = await transitionCaseStatus(
          update.caseId,
          update.newStatus,
          {
            actorId: userId,
            actorRole: "VOLUNTEER",
            actorName: "Field Guardian (Offline Sync)",
          },
          update.note || "Field status tapped offline",
          {
            offlineTimestamp: update.createdAt,
            syncedAt: new Date().toISOString(),
          }
        );

        if (result.success) {
          synced.push({
            localId: update.localId,
            caseId: update.caseId,
            status: update.newStatus,
          });
        } else {
          failed.push({ localId: update.localId, error: result.error || "Transition failed" });
        }
      } catch (err: any) {
        failed.push({ localId: update.localId, error: err?.message || "Failed to sync update" });
      }
    }

    return res.json({
      success: failed.length === 0,
      synced,
      failed,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Batch status sync failed" });
  }
}
