import { Request, Response } from "express";
import { supabase } from "../services/supabase";

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
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
    const { status } = req.body;

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
        message:
          "Status must be accepted or rejected",
      });
    }

    // Find assignment
    const {
      data: assignment,
      error: findError,
    } = await supabase
      .from("rescue_assignments")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !assignment) {
      return res.status(404).json({
        success: false,
        message: "Rescue assignment not found",
      });
    }

    // Only pending assignments can be responded to
    if (assignment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          `Assignment is already ${assignment.status}`,
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