import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../services/supabase";
import { calculateDistanceKm } from "../services/dispatch";
import * as sightingService from "../services/sightingService";
import * as matchService from "../services/lostFoundMatchService";

// Helper to fetch report owner ID from Supabase
async function getReportOwnerId(reportId: string): Promise<string | null> {
  const { data: report, error } = await supabase
    .from("reports")
    .select("ai_advice")
    .eq("id", reportId)
    .single();

  if (error || !report) {
    return null;
  }

  try {
    const metadata = JSON.parse(report.ai_advice || "{}");
    return metadata.reporterId || "6c4c4175-c2c4-470b-a5d5-c86639f3e949";
  } catch (e) {
    return "6c4c4175-c2c4-470b-a5d5-c86639f3e949";
  }
}

// POST /api/reports/lost-found
export async function createLostFoundReport(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      type, // "lost" or "found"
      animal,
      breed,
      color,
      location, // "lat, lon"
      description,
      photoUrl,
      uniqueId,
      collarColor,
      name,
      address,
      date,
      additionalInfo,
      urgency,
    } = req.body;

    if (!type || !animal || !breed || !color || !location || !photoUrl || !date) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const [latStr, lonStr] = location.split(",");
    const latitude = parseFloat(latStr.trim()) || 0.0;
    const longitude = parseFloat(lonStr.trim()) || 0.0;

    const metadata = {
      breed,
      color,
      collarColor: collarColor || "",
      uniqueId: uniqueId || "",
      name: name || "",
      address: address || "",
      date,
      description,
      additionalInfo: additionalInfo || "",
      reporterId: userId,
      urgency: urgency || "Normal",
      originalType: type,
    };

    const { data: report, error } = await supabase
      .from("reports")
      .insert([
        {
          image_url: photoUrl,
          latitude,
          longitude,
          status: type,
          animal_type: animal,
          ai_advice: JSON.stringify(metadata),
          severity: urgency || "Normal",
        },
      ])
      .select()
      .single();

    if (error || !report) {
      console.error("[LostFoundController] Insert error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to save report" });
    }

    const io = req.app.get("io");

    // 1. Notify Nearby Available Guardians
    try {
      const { data: guardians } = await supabase
        .from("guardians")
        .select("user_id, latitude, longitude")
        .eq("available", true);

      if (guardians && io) {
        guardians.forEach((g) => {
          if (g.latitude !== null && g.longitude !== null && g.user_id !== userId) {
            const distance = calculateDistanceKm(latitude, longitude, g.latitude, g.longitude);
            if (distance <= 5.0) {
              const alertPayload = {
                category: "lost_found",
                title: `🐾 ${type === "lost" ? "Lost" : "Found"} Animal Nearby`,
                message: `${name || breed} was reported ${type === "lost" ? "missing" : "found"} ${distance.toFixed(1)} km from you.`,
                read: false,
                imageUrl: photoUrl,
                linkUrl: "/lost-found",
                meta: { reportId: report.id },
              };
              io.to(`user:${g.user_id}`).emit("nearby_lost_found_alert", {
                notification: alertPayload,
              });
            }
          }
        });
      }
    } catch (gErr) {
      console.error("[LostFoundController] Guardian alerts error:", gErr);
    }

    // 2. Scan and Notify Possible Matches
    try {
      const oppositeType = type === "lost" ? "found" : "lost";
      const { data: activeReports } = await supabase
        .from("reports")
        .select("*")
        .eq("status", oppositeType);

      if (activeReports && activeReports.length > 0 && io) {
        for (const otherReport of activeReports) {
          const score = matchService.calculateMatchScore(report, otherReport);
          if (score >= 50) {
            let otherMeta: any = {};
            try {
              otherMeta = JSON.parse(otherReport.ai_advice || "{}");
            } catch {}
            const otherReporterId = otherMeta.reporterId;

            if (otherReporterId) {
              // Notification for new report owner
              io.to(`user:${userId}`).emit("nearby_lost_found_alert", {
                notification: {
                  category: "lost_found",
                  title: `🔎 Possible Match Found (${score}% Match)`,
                  message: `We found a matching ${oppositeType} animal report that may match yours.`,
                  read: false,
                  imageUrl: otherReport.image_url,
                  linkUrl: "/lost-found",
                  meta: { reportId: report.id, matchedReportId: otherReport.id, matchScore: score },
                },
              });

              // Notification for matched report owner
              io.to(`user:${otherReporterId}`).emit("nearby_lost_found_alert", {
                notification: {
                  category: "lost_found",
                  title: `🔎 Possible Match Found (${score}% Match)`,
                  message: `We found a matching ${type} animal report that may match yours.`,
                  read: false,
                  imageUrl: photoUrl,
                  linkUrl: "/lost-found",
                  meta: { reportId: otherReport.id, matchedReportId: report.id, matchScore: score },
                },
              });
            }
          }
        }
      }
    } catch (mErr) {
      console.error("[LostFoundController] Matching alerts error:", mErr);
    }

    // Format output
    const result = {
      id: report.id,
      type: report.status as "lost" | "found",
      animal: report.animal_type || "Other",
      breed: metadata.breed,
      color: metadata.color,
      collarColor: metadata.collarColor,
      uniqueId: metadata.uniqueId,
      location: `${report.latitude}, ${report.longitude}`,
      address: metadata.address,
      date: metadata.date,
      description: metadata.description,
      image: report.image_url || "",
      additionalInfo: metadata.additionalInfo,
      name: metadata.name,
      contactNumber: "",
      reporterId: metadata.reporterId,
      messages: [],
    };

    return res.status(201).json({ success: true, report: result });
  } catch (err: any) {
    console.error("[LostFoundController] Error creating report:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to create lost/found report" });
  }
}

// POST /api/reports/:reportId/sightings
export async function submitSighting(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const reportId = req.params.reportId as string;
    const { latitude, longitude, address, dateTimeSeen, description, photoUrl } = req.body;

    if (!latitude || !longitude || !dateTimeSeen) {
      return res.status(400).json({ success: false, message: "Coordinates and date/time seen are required" });
    }

    const sighting = await sightingService.createSighting(
      reportId,
      userId,
      parseFloat(latitude),
      parseFloat(longitude),
      address || "",
      dateTimeSeen,
      description || "",
      photoUrl || undefined
    );

    // Notify report owner
    const ownerId = await getReportOwnerId(reportId);
    const io = req.app.get("io");
    if (ownerId && ownerId !== userId && io) {
      io.to(`user:${ownerId}`).emit("nearby_lost_found_alert", {
        notification: {
          category: "lost_found",
          title: "👀 New Sighting Reported",
          message: `Someone reported seeing your animal at ${address || "nearby"}.`,
          read: false,
          imageUrl: photoUrl || undefined,
          linkUrl: "/lost-found",
          meta: { reportId, isSighting: true },
        },
      });
    }

    return res.status(201).json({ success: true, sighting });
  } catch (err: any) {
    console.error("[LostFoundController] Error submitting sighting:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to submit sighting" });
  }
}

// GET /api/reports/:reportId/sightings
export async function getSightings(req: AuthenticatedRequest, res: Response) {
  try {
    const reportId = req.params.reportId as string;
    const sightings = await sightingService.getSightingsForReport(reportId);
    return res.json({ success: true, sightings });
  } catch (err: any) {
    console.error("[LostFoundController] Error fetching sightings:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch sightings" });
  }
}

// GET /api/reports/:reportId/matches
export async function getPossibleMatches(req: AuthenticatedRequest, res: Response) {
  try {
    const reportId = req.params.reportId as string;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Fetch the target report
    const { data: report } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const oppositeType = report.status === "lost" ? "found" : "lost";
    const { data: activeReports } = await supabase
      .from("reports")
      .select("*")
      .eq("status", oppositeType);

    const matches: any[] = [];
    const dismissals = await matchService.readDismissedMatches();

    if (activeReports) {
      for (const other of activeReports) {
        // Skip if dismissed
        const isDismissed = dismissals.some(
          (d) =>
            d.userId === userId &&
            ((d.reportId === reportId && d.matchedReportId === other.id) ||
              (d.reportId === other.id && d.matchedReportId === reportId))
        );
        if (isDismissed) continue;

        const score = matchService.calculateMatchScore(report, other);
        if (score >= 50) {
          let meta: any = {};
          try {
            meta = JSON.parse(other.ai_advice || "{}");
          } catch {}

          matches.push({
            reportId: other.id,
            matchedReportId: reportId,
            score,
            breed: meta.breed || "",
            color: meta.color || "",
            image: other.image_url || "",
            type: other.status as "lost" | "found",
            location: `${other.latitude}, ${other.longitude}`,
            address: meta.address || "",
            date: meta.date || "",
          });
        }
      }
    }

    // Sort by match score descending
    matches.sort((a, b) => b.score - a.score);

    return res.json({ success: true, matches });
  } catch (err: any) {
    console.error("[LostFoundController] Error getting matches:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to get matches" });
  }
}

// POST /api/reports/:reportId/matches/:matchId/dismiss
export async function dismissMatch(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const reportId = req.params.reportId as string;
    const matchId = req.params.matchId as string;

    await matchService.dismissMatch(userId, reportId, matchId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[LostFoundController] Error dismissing match:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to dismiss match" });
  }
}

// POST /api/reports/:reportId/reunited
export async function markAsReunited(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const reportId = req.params.reportId as string;
    const { photoUrl } = req.body;

    const { data: report } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    let meta: any = {};
    try {
      meta = JSON.parse(report.ai_advice || "{}");
    } catch {}

    const ownerId = meta.reporterId;
    if (ownerId !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not own this report" });
    }

    meta.reunited = true;
    meta.reunionPhotoUrl = photoUrl || "";
    meta.reunitedAt = new Date().toISOString();

    const { error } = await supabase
      .from("reports")
      .update({
        status: "reunited",
        ai_advice: JSON.stringify(meta),
      })
      .eq("id", reportId);

    if (error) {
      console.error("[LostFoundController] Reunited update error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[LostFoundController] Error marking reunited:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to mark as reunited" });
  }
}
