import { Request, Response } from "express";
import { supabase } from "../services/supabase";

/**
 * Retrieve all pending (unverified) Guardians.
 */
export async function getUnverifiedGuardians(
  _req: Request,
  res: Response
) {
  try {
    const { data: guardians, error } = await supabase
      .from("guardians")
      .select("*, profiles!inner(full_name, phone, city, avatar_url)")
      .eq("is_verified", false);

    if (error) {
      console.error("[Admin] Error loading unverified guardians:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    // Flatten profiles relation if present
    const flattened = (guardians || []).map((g: any) => {
      const profile = g.profiles;
      return {
        id: g.id,
        user_id: g.user_id,
        latitude: g.latitude,
        longitude: g.longitude,
        available: g.available,
        total_rescues: g.total_rescues,
        bio: g.bio,
        experience: g.experience,
        last_active: g.last_active,
        is_verified: g.is_verified,
        created_at: g.created_at,
        full_name: profile?.full_name ?? "Unknown",
        phone: profile?.phone ?? "No phone",
        city: profile?.city ?? "Unknown",
        avatar_url: profile?.avatar_url ?? null,
      };
    });

    return res.status(200).json({
      success: true,
      guardians: flattened,
    });
  } catch (err: any) {
    console.error("[Admin] Exception loading unverified guardians:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load unverified guardians",
    });
  }
}

/**
 * Verify a Guardian by setting is_verified = true.
 */
export async function verifyGuardian(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Guardian ID is required",
      });
    }

    const { data: updated, error } = await supabase
      .from("guardians")
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Admin] Error verifying guardian:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      guardian: updated,
    });
  } catch (err: any) {
    console.error("[Admin] Exception verifying guardian:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to verify guardian",
    });
  }
}

/**
 * Retrieve all active (uncompleted) reports.
 */
export async function getActiveReports(
  _req: Request,
  res: Response
) {
  try {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .neq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Admin] Error loading active reports:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      reports: reports ?? [],
    });
  } catch (err: any) {
    console.error("[Admin] Exception loading active reports:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load active reports",
    });
  }
}
