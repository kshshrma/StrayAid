import { Request, Response } from "express";
import { supabase } from "../services/supabase";
import { AuthenticatedRequest } from "../middleware/auth";
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
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected",
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

    // Only pending assignments can be responded to
    if (assignment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Assignment is already ${assignment.status}`,
      });
    }

    // Update assignment
    const {
      data: updatedAssignment,
      error: updateError,
    } = await supabase
      .from("rescue_assignments")
      .update({
        status,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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