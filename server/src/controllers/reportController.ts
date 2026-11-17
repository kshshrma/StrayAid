import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../services/supabase";
import { calculateDistanceKm } from "../services/dispatch";

/**
 * GET /api/reports/immediate
 * Returns active Emergency/Critical reports.
 */
export async function getImmediateRescues(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    // Fetch Guardian profile to identify user's guardian ID
    const { data: guardian } = await supabase
      .from("guardians")
      .select("id")
      .eq("user_id", req.userId)
      .maybeSingle();

    const userGuardianId = guardian?.id || null;

    const { data: reports, error } = await supabase
      .from("reports")
      .select("id, image_url, latitude, longitude, animal_type, severity, priority, ai_advice, status, created_at, assigned_guardian_id");

    if (error) {
      console.error("[ReportDiscovery] Error fetching reports:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    // Filter: active reports where priority === "Emergency" OR severity === "Critical"
    const activeImmediate = (reports || []).filter((r: any) => {
      const status = (r.status || "").toLowerCase();
      const severity = (r.severity || "").toLowerCase();
      const priority = (r.priority || "").toLowerCase();

      const isPending = status === "pending";
      const isAccepted = status === "accepted" || status === "enroute" || status === "rescued";

      // If accepted: only visible to the specific user who accepted the report
      if (isAccepted) {
        if (!userGuardianId || r.assigned_guardian_id !== userGuardianId) {
          return false;
        }
      } else if (!isPending) {
        return false;
      }

      // Immediate Rescue Condition
      return priority === "emergency" || severity === "critical";
    });

    // Sort order:
    // 1st: Critical + Emergency
    // 2nd: Critical (but not Emergency)
    // 3rd: Emergency (but not Critical)
    // 4th: High + Emergency
    // then newer reports (created_at descending)
    function getUrgencyWeight(report: any) {
      const severity = (report.severity || "").toLowerCase();
      const priority = (report.priority || "").toLowerCase();

      if (severity === "critical" && priority === "emergency") return 4;
      if (severity === "critical") return 3;
      if (priority === "emergency") return 2;
      if (severity === "high" && priority === "emergency") return 1;
      return 0;
    }

    const sorted = activeImmediate.sort((a: any, b: any) => {
      const weightA = getUrgencyWeight(a);
      const weightB = getUrgencyWeight(b);

      if (weightA !== weightB) {
        return weightB - weightA; // Sort descending
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return res.status(200).json({
      success: true,
      reports: sorted,
    });
  } catch (err: any) {
    console.error("[ReportDiscovery] Exception in getImmediateRescues:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load immediate rescue requests",
    });
  }
}

/**
 * GET /api/reports/nearby
 * Returns active rescue reports geographically close to the user.
 */
export async function getNearbyReports(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    // 1. Fetch Guardian profile to check if user is a Guardian
    const { data: guardian, error: guardianError } = await supabase
      .from("guardians")
      .select("id, latitude, longitude")
      .eq("user_id", req.userId)
      .maybeSingle();

    if (guardianError) {
      console.error("[ReportDiscovery] Error checking Guardian profile:", guardianError);
    }

    const userGuardianId = guardian?.id || null;

    let latitude: number | null = null;
    let longitude: number | null = null;

    if (guardian) {
      latitude = guardian.latitude;
      longitude = guardian.longitude;

      if (latitude === null || longitude === null) {
        return res.status(400).json({
          success: false,
          message: "Guardian location coordinates are not set in the database",
        });
      }
    } else {
      // If citizen, read from query parameters
      const queryLat = parseFloat(req.query.latitude as string);
      const queryLon = parseFloat(req.query.longitude as string);

      if (isNaN(queryLat) || isNaN(queryLon)) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude query parameters are required for citizen role",
        });
      }

      if (queryLat < -90 || queryLat > 90 || queryLon < -180 || queryLon > 180) {
        return res.status(400).json({
          success: false,
          message: "Invalid latitude or longitude coordinate values",
        });
      }

      latitude = queryLat;
      longitude = queryLon;
    }

    // Read radius
    const radius = parseFloat(req.query.radius as string) || 10;
    if (isNaN(radius) || radius <= 0) {
      return res.status(400).json({
        success: false,
        message: "Radius query parameter must be a positive number",
      });
    }

    // 2. Fetch all reports to calculate distance
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select("id, image_url, latitude, longitude, animal_type, severity, priority, ai_advice, status, created_at, assigned_guardian_id");

    if (reportsError) {
      console.error("[ReportDiscovery] Error fetching reports for nearby query:", reportsError);
      return res.status(500).json({
        success: false,
        message: reportsError.message,
      });
    }

    // 3. Filter reports within radius
    const activeNearby = (reports || [])
      .filter((r: any) => {
        const status = (r.status || "").toLowerCase();
        const isPending = status === "pending";
        const isAccepted = status === "accepted" || status === "enroute" || status === "rescued";

        // If accepted: only visible to the user who accepted it
        if (isAccepted) {
          if (!userGuardianId || r.assigned_guardian_id !== userGuardianId) {
            return false;
          }
        } else if (!isPending) {
          return false;
        }

        return r.latitude !== null && r.longitude !== null;
      })
      .map((r: any) => {
        const dist = calculateDistanceKm(
          latitude!,
          longitude!,
          r.latitude,
          r.longitude
        );
        return {
          ...r,
          distance_km: parseFloat(dist.toFixed(1)),
        };
      })
      .filter((r: any) => r.distance_km <= radius);

    // Sort order:
    // FIRST by distance ascending.
    // SECOND by urgency descending (Critical -> Emergency -> High -> Medium -> Low).
    function getUrgencyWeight(report: any) {
      const severity = (report.severity || "").toLowerCase();
      const priority = (report.priority || "").toLowerCase();

      if (severity === "critical") return 5;
      if (priority === "emergency") return 4;
      if (severity === "high") return 3;
      if (severity === "medium") return 2;
      if (severity === "low") return 1;
      return 0;
    }

    const sorted = activeNearby.sort((a: any, b: any) => {
      // Sort primarily by distance ascending
      if (Math.abs(a.distance_km - b.distance_km) > 0.001) {
        return a.distance_km - b.distance_km;
      }

      // Sort secondarily by urgency weight descending
      const urgencyA = getUrgencyWeight(a);
      const urgencyB = getUrgencyWeight(b);
      if (urgencyA !== urgencyB) {
        return urgencyB - urgencyA;
      }

      // Tertiary sort: newer reports first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return res.status(200).json({
      success: true,
      location: {
        latitude,
        longitude,
      },
      radius_km: radius,
      reports: sorted,
    });
  } catch (err: any) {
    console.error("[ReportDiscovery] Exception in getNearbyReports:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load nearby reports",
    });
  }
}

/**
 * POST /api/reports/:id/accept
 * Accept a rescue report by the authenticated user
 */
export async function acceptReportHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Report ID is required",
      });
    }

    // 1. Verify report exists
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (reportErr || !report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // 2. Fetch or auto-create Guardian record for this user
    let { data: guardian } = await supabase
      .from("guardians")
      .select("id")
      .eq("user_id", req.userId)
      .maybeSingle();

    if (!guardian) {
      const { data: newGuardian, error: createGuardianErr } = await supabase
        .from("guardians")
        .insert({
          user_id: req.userId,
          available: true,
          is_verified: true,
        })
        .select("id")
        .single();

      if (createGuardianErr) {
        console.error("[ReportAccept] Failed to auto-create guardian:", createGuardianErr);
      } else {
        guardian = newGuardian;
      }
    }

    const guardianId = guardian?.id || null;
    if (!guardianId) {
      return res.status(403).json({
        success: false,
        message: "Unable to verify Guardian profile for authenticated user",
      });
    }

    // 3. Exclusivity Verification: Check if this rescue is already claimed by someone else
    const currentStatus = (report.status || "").toLowerCase();
    if (
      report.assigned_guardian_id &&
      report.assigned_guardian_id !== guardianId
    ) {
      return res.status(409).json({
        success: false,
        message: "This rescue has already been claimed by another Guardian",
      });
    }

    if (currentStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "This rescue is already completed",
      });
    }

    if (currentStatus === "accepted" && report.assigned_guardian_id !== guardianId) {
      return res.status(409).json({
        success: false,
        message: "This rescue has already been claimed by another Guardian",
      });
    }

    const nowIso = new Date().toISOString();

    // 4. Update report status to accepted and lock to this Guardian
    const updatePayload: any = {
      status: "accepted",
      assigned_guardian_id: guardianId,
      accepted_at: report.accepted_at || nowIso,
      updated_at: nowIso,
    };

    const { data: updatedReport, error: updateError } = await supabase
      .from("reports")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[ReportAccept] Error updating report:", updateError);
      return res.status(500).json({
        success: false,
        message: updateError.message || "Failed to update report",
      });
    }

    // 5. Ensure authoritative rescue_assignment for this Guardian
    try {
      const { data: existingAssignment } = await supabase
        .from("rescue_assignments")
        .select("id")
        .eq("report_id", id)
        .eq("guardian_id", guardianId)
        .maybeSingle();

      if (existingAssignment) {
        await supabase
          .from("rescue_assignments")
          .update({
            status: "accepted",
            responded_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", existingAssignment.id);
      } else {
        await supabase
          .from("rescue_assignments")
          .insert({
            report_id: id,
            guardian_id: guardianId,
            status: "accepted",
            responded_at: nowIso,
            updated_at: nowIso,
          });
      }

      // Cancel any other pending assignments for this report to other Guardians
      await supabase
        .from("rescue_assignments")
        .update({ status: "cancelled", updated_at: nowIso })
        .eq("report_id", id)
        .neq("guardian_id", guardianId)
        .eq("status", "pending");
    } catch (assignErr) {
      console.warn("[ReportAccept] Rescue assignment check/insert warning:", assignErr);
    }

    return res.status(200).json({
      success: true,
      message: "Rescue accepted successfully",
      report: updatedReport,
    });
  } catch (err: any) {
    console.error("[ReportAccept] Exception in acceptReportHandler:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to accept rescue report",
    });
  }
}
