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

/**
 * Retrieve all verified and available Guardians.
 */
export async function getAvailableGuardians(
  _req: Request,
  res: Response
) {
  try {
    const { data: guardians, error } = await supabase
      .from("guardians")
      .select("*, profiles(full_name, phone)")
      .eq("is_verified", true)
      .eq("available", true);

    if (error) {
      console.error("[Admin] Error loading available guardians:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const flattened = (guardians || []).map((g: any) => {
      const profile = g.profiles;
      return {
        id: g.id,
        user_id: g.user_id,
        latitude: g.latitude,
        longitude: g.longitude,
        bio: g.bio,
        total_rescues: g.total_rescues,
        full_name: profile?.full_name ?? "Unknown",
        phone: profile?.phone ?? "No phone",
      };
    });

    return res.status(200).json({
      success: true,
      guardians: flattened,
    });
  } catch (err: any) {
    console.error("[Admin] Exception loading available guardians:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load available guardians",
    });
  }
}

/**
 * Manually assign a Guardian to a report, overriding the automatic dispatch pipeline.
 */
export async function overrideDispatch(
  req: Request,
  res: Response
) {
  try {
    const { reportId, guardianId } = req.body;

    if (!reportId || !guardianId) {
      return res.status(400).json({
        success: false,
        message: "reportId and guardianId are required",
      });
    }

    // 1. Verify Guardian is active/available/verified
    const { data: guardian, error: gErr } = await supabase
      .from("guardians")
      .select("id, available, is_verified")
      .eq("id", guardianId)
      .single();

    if (gErr || !guardian) {
      return res.status(404).json({
        success: false,
        message: "Guardian not found",
      });
    }

    if (!guardian.is_verified || !guardian.available) {
      return res.status(400).json({
        success: false,
        message: "Guardian is either unverified or unavailable",
      });
    }

    // 2. Verify Report is active
    const { data: report, error: rErr } = await supabase
      .from("reports")
      .select("id, status")
      .eq("id", reportId)
      .single();

    if (rErr || !report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (report.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Report is already completed",
      });
    }

    // 3. Mark all previous assignments for this report as cancelled
    await supabase
      .from("rescue_assignments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("report_id", reportId)
      .in("status", ["pending", "accepted", "enroute", "rescued"]);

    // 4. Create new manual assignment (direct status 'accepted')
    const nowIso = new Date().toISOString();
    const { data: assignment, error: aErr } = await supabase
      .from("rescue_assignments")
      .insert({
        report_id: reportId,
        guardian_id: guardianId,
        status: "accepted",
        responded_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (aErr) {
      console.error("[Admin] Error creating manual assignment:", aErr);
      return res.status(500).json({
        success: false,
        message: aErr.message,
      });
    }

    // 5. Update Report
    const { error: repUpdateErr } = await supabase
      .from("reports")
      .update({
        status: "accepted",
        assigned_guardian_id: guardianId,
        accepted_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", reportId);

    if (repUpdateErr) {
      console.error("[Admin] Error updating report status:", repUpdateErr);
    }

    return res.status(200).json({
      success: true,
      message: "Guardian assigned manually",
      assignment,
    });
  } catch (err: any) {
    console.error("[Admin] Exception in overrideDispatch:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to override dispatch",
    });
  }
}

/**
 * Manually update a report/rescue lifecycle status.
 */
export async function updateReportStatusManually(
  req: Request,
  res: Response
) {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    const allowed = ["accepted", "enroute", "rescued", "completed"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing status parameter",
      });
    }

    // 1. Verify Report exists
    const { data: report, error: rErr } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (rErr || !report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // 2. Find active assignment for this report
    const { data: assignment, error: aErr } = await supabase
      .from("rescue_assignments")
      .select("*")
      .eq("report_id", reportId)
      .in("status", ["accepted", "enroute", "rescued"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nowIso = new Date().toISOString();

    // 3. Update active assignment if it exists
    if (assignment) {
      const { error: updateAssignErr } = await supabase
        .from("rescue_assignments")
        .update({
          status,
          updated_at: nowIso,
        })
        .eq("id", assignment.id);

      if (updateAssignErr) {
        console.error("[Admin] Error updating active assignment status:", updateAssignErr);
      }
    }

    // 4. Update Report fields
    const updateData: any = {
      status,
      updated_at: nowIso,
    };

    if (status === "accepted") {
      updateData.accepted_at = nowIso;
    } else if (status === "enroute") {
      updateData.enroute_at = nowIso;
    } else if (status === "rescued") {
      updateData.rescued_at = nowIso;
    } else if (status === "completed") {
      updateData.completed_at = nowIso;
    }

    const { error: repUpdateErr } = await supabase
      .from("reports")
      .update(updateData)
      .eq("id", reportId);

    if (repUpdateErr) {
      console.error("[Admin] Error updating report:", repUpdateErr);
      return res.status(500).json({
        success: false,
        message: repUpdateErr.message,
      });
    }

    // 5. If status is completed and there's a Guardian assigned, increment rescues count
    if (status === "completed" && report.assigned_guardian_id) {
      const { data: gProfile } = await supabase
        .from("guardians")
        .select("total_rescues")
        .eq("id", report.assigned_guardian_id)
        .single();

      if (gProfile) {
        await supabase
          .from("guardians")
          .update({
            total_rescues: (gProfile.total_rescues || 0) + 1,
            updated_at: nowIso,
          })
          .eq("id", report.assigned_guardian_id);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Report status updated manually to ${status}`,
    });
  } catch (err: any) {
    console.error("[Admin] Exception manually updating report status:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update report status",
    });
  }
}
