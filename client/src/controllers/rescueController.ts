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