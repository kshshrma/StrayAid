import { Request, Response } from "express";
import { supabase } from "../services/supabase";
import { AuthenticatedRequest } from "../middleware/auth";
import { dispatchReport } from "../services/dispatch";
/**
 * Create a new rescue assignment
 */
export async function createAssignment(
  req: Request,
  res: Response
) {
  try {
    const {
      reportId,
      guardianId,
      distanceKm,
      dispatchScore,
    } = req.body;

    if (!reportId || !guardianId) {
      return res.status(400).json({
        success: false,
        message: "reportId and guardianId are required",
      });
    }

    // Check guardian
    const {
      data: guardian,
      error: guardianError,
    } = await supabase
      .from("guardians")
      .select("*")
      .eq("id", guardianId)
      .single();

    if (guardianError || !guardian) {
      return res.status(404).json({
        success: false,
        message: "Guardian not found",
      });
    }

    // Guardian must be available
    if (!guardian.available) {
      return res.status(400).json({
        success: false,
        message: "Guardian is not available",
      });
    }

    // Guardian must be verified
    if (!guardian.is_verified) {
      return res.status(400).json({
        success: false,
        message: "Guardian is not verified",
      });
    }

    // Check report
    const {
      data: report,
      error: reportError,
    } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Create assignment
    const {
      data: assignment,
      error: assignmentError,
    } = await supabase
      .from("rescue_assignments")
      .insert({
        report_id: reportId,
        guardian_id: guardianId,
        distance_km: distanceKm ?? null,
        dispatch_score: dispatchScore ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (assignmentError) {
      console.error(
        "Create assignment error:",
        assignmentError
      );
if (assignmentError.code === "23505") {
    return res.status(409).json({
      success: false,
      message:
        "This Guardian is already assigned to this rescue.",
    });
  }

      return res.status(500).json({
        success: false,
        message: assignmentError.message,
      });
    }

    return res.status(201).json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error(
      "Create assignment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create rescue assignment",
    });
  }
}

/**
 * Update rescue assignment
 * Allowed statuses:
 * - accepted
 * - rejected
 */
export async function updateAssignment(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID is required",
      });
    }

    const allowedStatuses = [
      "accepted",
      "rejected",
      "enroute",
      "rescued",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status parameter",
      });
    }

    // Find Guardian belonging to logged-in user
    const {
      data: guardian,
      error: guardianError,
    } = await supabase
      .from("guardians")
      .select("id")
      .eq("user_id", req.userId)
      .single();

    if (guardianError || !guardian) {
      return res.status(403).json({
        success: false,
        message: "Guardian profile not found",
      });
    }

    // Find assignment
    const {
      data: assignment,
      error: assignmentError,
    } = await supabase
      .from("rescue_assignments")
      .select("*")
      .eq("id", id)
      .single();

    if (assignmentError || !assignment) {
      return res.status(404).json({
        success: false,
        message: "Rescue assignment not found",
      });
    }

    // Make sure this assignment belongs to this Guardian
    if (assignment.guardian_id !== guardian.id) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this rescue",
      });
    }

    // Validate valid state transitions
    const currentStatus = assignment.status;
    let isValidTransition = false;

    if (currentStatus === "pending") {
      isValidTransition = status === "accepted" || status === "rejected";
    } else if (currentStatus === "accepted") {
      isValidTransition = status === "enroute" || status === "rescued" || status === "completed" || status === "rejected";
    } else if (currentStatus === "enroute") {
      isValidTransition = status === "rescued" || status === "completed";
    } else if (currentStatus === "rescued") {
      isValidTransition = status === "completed";
    }

    if (!isValidTransition) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition assignment from ${currentStatus} to ${status}`,
      });
    }

    // Update assignment
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "accepted" || status === "rejected") {
      updateData.responded_at = new Date().toISOString();
    }

    const {
      data: updatedAssignment,
      error: updateError,
    } = await supabase
      .from("rescue_assignments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error(
        "Update assignment error:",
        updateError
      );

      return res.status(500).json({
        success: false,
        message: updateError.message,
      });
    }

    // Handle Report status updates and other side-effects
    try {
      const nowIso = new Date().toISOString();
      if (status === "accepted") {
        await supabase
          .from("reports")
          .update({
            status: "accepted",
            assigned_guardian_id: guardian.id,
            accepted_at: nowIso,
          })
          .eq("id", assignment.report_id);
      } else if (status === "rejected") {
        // Trigger fallback dispatch to next Guardian
        const { data: report } = await supabase
          .from("reports")
          .select("id, latitude, longitude, severity")
          .eq("id", assignment.report_id)
          .single();

        if (report && report.latitude !== null && report.longitude !== null) {
          // Fire-and-forget next dispatch trigger
          dispatchReport(
            report.id,
            report.latitude,
            report.longitude,
            report.severity || "Medium"
          ).catch((err) =>
            console.error("[Dispatch] Fallback dispatch failed on reject:", err)
          );
        }
      } else if (status === "enroute") {
        await supabase
          .from("reports")
          .update({
            status: "enroute",
            enroute_at: nowIso,
          })
          .eq("id", assignment.report_id);
      } else if (status === "rescued") {
        await supabase
          .from("reports")
          .update({
            status: "rescued",
            rescued_at: nowIso,
          })
          .eq("id", assignment.report_id);
      } else if (status === "completed") {
        // Update report status to completed
        await supabase
          .from("reports")
          .update({
            status: "completed",
            completed_at: nowIso,
          })
          .eq("id", assignment.report_id);

        // Fetch current rescues total
        const { data: gProfile } = await supabase
          .from("guardians")
          .select("total_rescues")
          .eq("id", guardian.id)
          .single();

        // Increment total rescues
        await supabase
          .from("guardians")
          .update({
            total_rescues: (gProfile?.total_rescues ?? 0) + 1,
            updated_at: nowIso,
          })
          .eq("id", guardian.id);
      }
    } catch (err) {
      console.error("Failed handling side effects for assignment status transition:", status, err);
    }
    return res.status(200).json({
      success: true,
      assignment: updatedAssignment,
    });
  } catch (error) {
    console.error(
      "Update assignment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update rescue assignment",
    });
  }
}
/**
 * Get rescue assignments for the authenticated Guardian
 */
export async function getMyAssignments(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
      });
    }

    // Find Guardian belonging to logged-in user
    const {
      data: guardian,
      error: guardianError,
    } = await supabase
      .from("guardians")
      .select("id")
      .eq("user_id", req.userId)
      .single();

    if (guardianError || !guardian) {
      return res.status(403).json({
        success: false,
        message: "Guardian profile not found",
      });
    }

    // Get assignments belonging to this Guardian
    const {
      data: assignments,
      error: assignmentsError,
    } = await supabase
      .from("rescue_assignments")
      .select("*")
      .eq("guardian_id", guardian.id)
      .order("created_at", {
        ascending: false,
      });

    if (assignmentsError) {
      console.error(
        "Get assignments error:",
        assignmentsError
      );

      return res.status(500).json({
        success: false,
        message: assignmentsError.message,
      });
    }

    return res.status(200).json({
      success: true,
      assignments: assignments ?? [],
    });
  } catch (error) {
    console.error(
      "Get my assignments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get rescue assignments",
    });
  }
}