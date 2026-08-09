import { Request, Response } from "express";
import { supabase } from "../services/supabase";

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

    if (!reportId || !guardianId) {
      return res.status(400).json({
        success: false,
        message: "reportId and guardianId are required",
      });
    }

    // Check Guardian
    const { data: guardian, error: guardianError } =
      await supabase
        .from("guardians")
        .select("id, available, is_verified")
        .eq("id", guardianId)
        .single();

    if (guardianError || !guardian) {
      return res.status(404).json({
        success: false,
        message: "Guardian not found",
      });
    }

    if (!guardian.available) {
      return res.status(400).json({
        success: false,
        message: "Guardian is not available",
      });
    }

    if (!guardian.is_verified) {
      return res.status(400).json({
        success: false,
        message: "Guardian is not verified",
      });
    }

    // Create assignment
    const { data, error } = await supabase
      .from("rescue_assignments")
      .insert({
        report_id: reportId,
        guardian_id: guardianId,
        status: "pending",
        distance_km: distanceKm ?? null,
        dispatch_score: dispatchScore ?? null,
        expires_at: expiresAt ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      success: true,
      assignment: data,
    });
  } catch (error) {
    console.error("Create assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create rescue assignment",
    });
  }
}