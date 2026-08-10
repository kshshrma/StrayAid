import { Request, Response } from "express";

import {
  createRescueAssignment,
} from "../services/rescue";

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
      expiresAt,
    } = req.body;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: "Report ID is required",
      });
    }

    if (!guardianId) {
      return res.status(400).json({
        success: false,
        message:
          "Guardian ID is required",
      });
    }

    const assignment =
      await createRescueAssignment({
        reportId,
        guardianId,
        distanceKm,
        dispatchScore,
        expiresAt,
      });

    return res.status(201).json({
      success: true,
      assignment,
    });
  } catch (error: any) {
    console.error(
      "Create Assignment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create rescue assignment",
    });
  }
}
export async function updateAssignment(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
    const { status } = req.body;

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

    // Check that assignment exists
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

    // Only pending assignments can be accepted/rejected
    if (assignment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          `Assignment is already ${assignment.status}`,
      });
    }

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
      throw updateError;
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
      message:
        "Failed to update rescue assignment",
    });
  }
}