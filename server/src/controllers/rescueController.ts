import { Request, Response } from "express";
import { supabase } from "../services/supabase";
import { AuthenticatedRequest } from "../middleware/auth";
import { dispatchReport } from "../services/dispatch";
import { getRegisteredNgoById } from "../services/ngoService";
import { getOrCreateNgoConversation, createMessage } from "../services/messageService";
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

    // Idempotency: If this assignment is already completed, do not re-process or re-increment
    if (assignment.status === "completed") {
      const { data: completedList } = await supabase
        .from("rescue_assignments")
        .select("report_id")
        .eq("guardian_id", guardian.id)
        .eq("status", "completed");

      const uniqueReportIds = new Set((completedList || []).map((a) => a.report_id));
      const totalCompleted = uniqueReportIds.size;

      return res.status(200).json({
        success: true,
        message: "Rescue assignment is already completed",
        assignment,
        totalRescues: totalCompleted,
        livesSaved: totalCompleted,
      });
    }

    // Verify report exclusivity before accepting
    if (status === "accepted") {
      const { data: reportRecord } = await supabase
        .from("reports")
        .select("assigned_guardian_id, status")
        .eq("id", assignment.report_id)
        .single();

      if (
        reportRecord &&
        reportRecord.assigned_guardian_id &&
        reportRecord.assigned_guardian_id !== guardian.id
      ) {
        return res.status(409).json({
          success: false,
          message: "This rescue has already been claimed by another Guardian",
        });
      }
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
    const nowIso = new Date().toISOString();
    const updateData: any = {
      status,
      updated_at: nowIso,
    };

    if (status === "accepted" || status === "rejected") {
      updateData.responded_at = nowIso;
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
      if (status === "accepted") {
        await supabase
          .from("reports")
          .update({
            status: "accepted",
            assigned_guardian_id: guardian.id,
            accepted_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", assignment.report_id);

        // Cancel any other pending assignments for this report to other guardians
        await supabase
          .from("rescue_assignments")
          .update({ status: "cancelled", updated_at: nowIso })
          .eq("report_id", assignment.report_id)
          .neq("guardian_id", guardian.id)
          .eq("status", "pending");
      } else if (status === "rejected") {
        // If this report was assigned to this guardian, clear it
        await supabase
          .from("reports")
          .update({
            status: "pending",
            assigned_guardian_id: null,
            accepted_at: null,
            updated_at: nowIso,
          })
          .eq("id", assignment.report_id)
          .eq("assigned_guardian_id", guardian.id);

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
            updated_at: nowIso,
          })
          .eq("id", assignment.report_id);
      } else if (status === "rescued") {
        await supabase
          .from("reports")
          .update({
            status: "rescued",
            rescued_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", assignment.report_id);
      } else if (status === "completed") {
        // Update report status to completed
        await supabase
          .from("reports")
          .update({
            status: "completed",
            completed_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", assignment.report_id);

        // Calculate exact, distinct completed rescues for this Guardian only
        const { data: completedList } = await supabase
          .from("rescue_assignments")
          .select("report_id")
          .eq("guardian_id", guardian.id)
          .eq("status", "completed");

        const uniqueReportIds = new Set((completedList || []).map((a) => a.report_id));
        const totalCompleted = uniqueReportIds.size;

        // Synchronize total_rescues in guardians table
        await supabase
          .from("guardians")
          .update({
            total_rescues: totalCompleted,
            updated_at: nowIso,
          })
          .eq("id", guardian.id);
      }
    } catch (err) {
      console.error("Failed handling side effects for assignment status transition:", status, err);
    }

    // Query this guardian's verified total completed rescues
    const { data: completedList } = await supabase
      .from("rescue_assignments")
      .select("report_id")
      .eq("guardian_id", guardian.id)
      .eq("status", "completed");

    const uniqueReportIds = new Set((completedList || []).map((a) => a.report_id));
    const totalCompleted = uniqueReportIds.size;

    return res.status(200).json({
      success: true,
      assignment: updatedAssignment,
      totalRescues: totalCompleted,
      livesSaved: totalCompleted,
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

/**
 * Create a new rescue request from the automated Connect chatbot
 * Authenticated endpoint: req.userId
 */
export async function createBotRescueRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const {
      ngoId,
      rescueType,
      subType,
      latitude,
      longitude,
      manualLocation,
      imageUrl,
      inDanger,
      notes,
    } = req.body;

    if (!ngoId || !rescueType) {
      return res.status(400).json({
        success: false,
        message: "ngoId and rescueType are required",
      });
    }

    // 1. Verify NGO exists
    const ngo = getRegisteredNgoById(ngoId);
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "Registered NGO not found",
      });
    }

    // Format human-readable rescue title & description
    let rescueTitle = "Injured Animal";
    let priority = "Urgent";
    let severity = "High";

    if (rescueType === "injured_animal") {
      rescueTitle = "Injured Animal Rescue";
      severity = "High";
      priority = "Urgent";
    } else if (rescueType === "trapped_animal") {
      rescueTitle = `Trapped Animal (${subType || "Unspecified"})`;
      severity = "High";
      priority = "Urgent";
    } else if (rescueType === "weak_abandoned_baby") {
      rescueTitle = inDanger ? "Abandoned Baby (In Danger)" : "Weak / Abandoned Baby";
      severity = inDanger ? "Critical" : "Medium";
      priority = inDanger ? "Emergency" : "Normal";
    }

    const locationText = manualLocation || (latitude && longitude ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}` : "Location Shared");

    const metadata = {
      reporterId: userId,
      ngoId: ngo.id,
      ngoName: ngo.name,
      rescueType,
      subType: subType || null,
      manualLocation: manualLocation || null,
      inDanger: inDanger || false,
      notes: notes || null,
      source: "connect_chatbot",
    };

    // 2. Insert into Supabase reports table
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        animal_type: "Dog",
        severity,
        priority,
        status: "pending",
        latitude: latitude ? Number(latitude) : 28.4744,
        longitude: longitude ? Number(longitude) : 77.5040,
        image_url: imageUrl || null,
        ai_advice: JSON.stringify(metadata),
      })
      .select()
      .single();

    if (reportError) {
      console.error("[RescueController] Error creating report from chatbot:", reportError);
      return res.status(500).json({
        success: false,
        message: reportError.message || "Failed to create rescue report",
      });
    }

    // 3. Create or retrieve NGO conversation
    const conversation = await getOrCreateNgoConversation(userId, ngoId);

    // 4. Create an automated case summary message in the NGO conversation
    const caseSummary = `🚨 NEW RESCUE REQUEST: ${rescueTitle}\n📍 Location: ${locationText}\n⚡ Priority: ${priority}\n⚠️ Status: Pending NGO Dispatch`;

    const message = await createMessage({
      conversationId: conversation.id,
      reportId: report.id,
      senderId: userId,
      recipientId: ngo.representativeUserId,
      content: caseSummary,
      metadata: {
        type: "report_attachment",
        reportId: report.id,
        animalType: "Rescue Request",
        breed: rescueTitle,
        status: "lost",
        location: locationText,
        urgency: priority,
        imageUrl: imageUrl || undefined,
      },
    });

    // 5. Emit real-time Socket.IO notifications
    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversation.id}`).emit("new_message", { message });
      io.to(`user:${ngo.representativeUserId}`).emit("secure_message_received", { message });
    }

    // 6. Trigger smart dispatch if valid coordinates exist
    if (latitude && longitude) {
      dispatchReport(report.id, Number(latitude), Number(longitude), severity).catch((err) => {
        console.error("[RescueController] Auto dispatch error:", err);
      });
    }

    return res.status(201).json({
      success: true,
      reportId: report.id,
      conversationId: conversation.id,
      message,
    });
  } catch (error: any) {
    console.error("[RescueController] Exception in createBotRescueRequest:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process rescue request",
    });
  }
}

/**
 * GET /api/rescue/my-history
 * Returns completed rescue assignments and associated report details
 * strictly belonging to the authenticated Guardian.
 */
export async function getMyRescueHistory(
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

    const { data: guardian, error: guardianError } = await supabase
      .from("guardians")
      .select("id")
      .eq("user_id", req.userId)
      .maybeSingle();

    if (guardianError || !guardian) {
      return res.status(403).json({
        success: false,
        message: "Guardian profile not found",
      });
    }

    // 1. Fetch completed assignments for THIS guardian only
    const { data: assignments, error: assignErr } = await supabase
      .from("rescue_assignments")
      .select("*")
      .eq("guardian_id", guardian.id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false });

    if (assignErr) {
      console.error("[RescueController] Error loading history:", assignErr);
      return res.status(500).json({
        success: false,
        message: assignErr.message,
      });
    }

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({
        success: true,
        history: [],
        totalRescues: 0,
        livesSaved: 0,
      });
    }

    // 2. Fetch associated reports
    const reportIds = Array.from(new Set(assignments.map((a) => a.report_id).filter(Boolean)));
    const { data: reports, error: reportsErr } = await supabase
      .from("reports")
      .select("id, animal_type, image_url, latitude, longitude, severity, priority, status, created_at, accepted_at, completed_at, ai_advice")
      .in("id", reportIds);

    if (reportsErr) {
      console.error("[RescueController] Error loading report details for history:", reportsErr);
    }

    const reportMap = new Map((reports || []).map((r) => [r.id, r]));

    // 3. Assemble history entries
    const history = assignments.map((assignment) => {
      const report = reportMap.get(assignment.report_id) || null;
      let notes = "";
      try {
        const parsed = JSON.parse(report?.ai_advice || "{}");
        notes = parsed.description || parsed.notes || "";
      } catch {}

      return {
        assignmentId: assignment.id,
        reportId: assignment.report_id,
        guardianId: assignment.guardian_id,
        status: assignment.status,
        assignedAt: assignment.created_at || assignment.assigned_at,
        acceptedAt: report?.accepted_at || assignment.responded_at,
        completedAt: report?.completed_at || assignment.updated_at,
        distanceKm: assignment.distance_km,
        animalType: report?.animal_type || "Animal",
        imageUrl: report?.image_url || null,
        latitude: report?.latitude ?? null,
        longitude: report?.longitude ?? null,
        severity: report?.severity || "Normal",
        priority: report?.priority || "Normal",
        notes,
      };
    });

    const uniqueReportsCount = new Set(assignments.map((a) => a.report_id)).size;

    return res.status(200).json({
      success: true,
      history,
      totalRescues: uniqueReportsCount,
      livesSaved: uniqueReportsCount,
    });
  } catch (err: any) {
    console.error("[RescueController] Exception in getMyRescueHistory:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load rescue history",
    });
  }
}

/**
 * GET /api/rescue/my-stats
 * Returns verified individual statistics for the authenticated Guardian.
 */
export async function getMyGuardianStats(
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

    const { data: guardian, error: guardianError } = await supabase
      .from("guardians")
      .select("id, available, is_verified, total_rescues, experience, bio")
      .eq("user_id", req.userId)
      .maybeSingle();

    if (guardianError || !guardian) {
      return res.status(403).json({
        success: false,
        message: "Guardian profile not found",
      });
    }

    // Query assignments for this Guardian
    const { data: assignments, error: assignErr } = await supabase
      .from("rescue_assignments")
      .select("report_id, status")
      .eq("guardian_id", guardian.id);

    if (assignErr) {
      return res.status(500).json({
        success: false,
        message: assignErr.message,
      });
    }

    const all = assignments || [];
    const completedAssignments = all.filter((a) => a.status === "completed");
    const activeAssignments = all.filter((a) => ["accepted", "enroute", "rescued"].includes(a.status));
    const pendingAssignments = all.filter((a) => a.status === "pending");

    const uniqueCompletedReports = new Set(completedAssignments.map((a) => a.report_id));
    const livesSaved = uniqueCompletedReports.size;

    // Determine level
    let guardianLevel = "Rookie Guardian";
    if (livesSaved >= 10) {
      guardianLevel = "Master Guardian";
    } else if (livesSaved >= 5) {
      guardianLevel = "Senior Guardian";
    } else if (livesSaved >= 1) {
      guardianLevel = "Junior Guardian";
    }

    // Sync total_rescues in database if out of date
    if (guardian.total_rescues !== livesSaved) {
      await supabase
        .from("guardians")
        .update({ total_rescues: livesSaved })
        .eq("id", guardian.id);
    }

    return res.status(200).json({
      success: true,
      stats: {
        guardianId: guardian.id,
        totalRescues: livesSaved,
        livesSaved,
        activeAssignments: activeAssignments.length,
        pendingAssignments: pendingAssignments.length,
        available: guardian.available,
        isVerified: guardian.is_verified,
        guardianLevel,
      },
    });
  } catch (err: any) {
    console.error("[RescueController] Exception in getMyGuardianStats:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load Guardian statistics",
    });
  }
}

/**
 * GET /api/rescue/my-rescues
 * Returns all active & completed reports claimed by the authenticated Guardian
 * (For the Lives Saved view & Guardian personal tracking)
 */
export async function getMyAcceptedRescues(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { data: guardian } = await supabase
      .from("guardians")
      .select("id")
      .eq("user_id", req.userId)
      .maybeSingle();

    if (!guardian) {
      return res.status(200).json({
        success: true,
        rescues: [],
        livesSavedCount: 0,
        activeCount: 0,
      });
    }

    // Query assignments for this guardian
    const { data: assignments } = await supabase
      .from("rescue_assignments")
      .select("id, report_id, status, distance_km, dispatch_score, created_at, updated_at, responded_at")
      .eq("guardian_id", guardian.id)
      .in("status", ["accepted", "enroute", "rescued", "completed"])
      .order("updated_at", { ascending: false });

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({
        success: true,
        rescues: [],
        livesSavedCount: 0,
        activeCount: 0,
      });
    }

    const reportIds = Array.from(new Set(assignments.map((a) => a.report_id)));
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .in("id", reportIds);

    const reportMap = new Map((reports || []).map((r) => [r.id, r]));

    const combined = assignments.map((assign) => {
      const rep = reportMap.get(assign.report_id);
      return {
        assignmentId: assign.id,
        assignmentStatus: assign.status,
        distanceKm: assign.distance_km,
        report: rep || null,
        acceptedAt: rep?.accepted_at || assign.responded_at,
        completedAt: rep?.completed_at || (assign.status === "completed" ? assign.updated_at : null),
      };
    });

    const completedDistinct = new Set(
      assignments.filter((a) => a.status === "completed").map((a) => a.report_id)
    ).size;
    const activeCount = assignments.filter((a) => ["accepted", "enroute", "rescued"].includes(a.status)).length;

    return res.status(200).json({
      success: true,
      rescues: combined,
      livesSavedCount: completedDistinct,
      activeCount,
    });
  } catch (err: any) {
    console.error("[RescueController] Exception in getMyAcceptedRescues:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load rescues",
    });
  }
}