import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  createRescueCase,
  getCasesForUser,
  getCaseById,
  transitionCaseStatus,
  acceptCaseByNgo,
  rejectCaseByNgo,
  reopenCase,
  readTimeline,
  syncOfflineStatusUpdates,
  filterCaseByInformationTier,
  confirmCaseSeverity,
  getDeceasedNotificationCopy,
  readCases,
  writeCases,
  CaseStatus,
  PaymentResponsibility,
} from "../services/caseService";
import { performAiTriage } from "../services/aiTriageService";
import {
  readVolunteers,
  matchFostersForCase,
  createCaseAssignment,
} from "../services/volunteerService";
import {
  readVetClinics,
  generateVetCaseSnapshot,
  createVetReferral,
} from "../services/vetService";
import { supabase } from "../services/supabase";

async function getUserProfileRole(userId: string): Promise<{ role: string; fullName: string; ngoId?: string | undefined }> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, city")
      .eq("id", userId)
      .single();

    if (profile) {
      return {
        role: profile.role || "citizen",
        fullName: profile.full_name || "StrayAid User",
      };
    }
  } catch {}
  return { role: "citizen", fullName: "StrayAid User" };
}

/**
 * POST /api/cases - Create new rescue case
 */
export async function createCaseHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      reportId,
      animalType,
      breed,
      condition,
      priority,
      exactLocation,
      generalLocation,
      coordinates,
      photos,
      targetNgoId,
      paymentResponsibility,
      reporterName,
      reporterPhone,
    } = req.body;

    if (!exactLocation) {
      return res.status(400).json({ success: false, message: "Exact location is required" });
    }

    const { fullName } = await getUserProfileRole(userId);

    const newCase = await createRescueCase({
      reportId,
      animalType: animalType || "dog",
      breed,
      condition,
      priority: priority || "normal",
      reporterId: userId,
      reporterName: reporterName || fullName,
      reporterPhone,
      exactLocation,
      generalLocation,
      coordinates,
      photos: photos || [],
      targetNgoId,
      paymentResponsibility: paymentResponsibility as PaymentResponsibility,
    });

    // Run AI Triage asynchronously (Section 8 — does not block case response)
    const photo = (photos && photos.length > 0) ? photos[0] : undefined;
    performAiTriage(photo, condition).then(async (triageResult) => {
      try {
        const cases = await readCases();
        const idx = cases.findIndex((c) => c.caseId === newCase.caseId);
        if (idx !== -1 && cases[idx]) {
          cases[idx].ai_severity = triageResult.suggested_severity;
          cases[idx].ai_injury_type = triageResult.visible_injuries;
          cases[idx].ai_raw_response = triageResult;
          cases[idx].ai_triage_at = new Date().toISOString();
          cases[idx].safety_warning = triageResult.safety_warning || undefined;
          await writeCases(cases);

          const io = req.app.get("io");
          if (io) {
            io.to(`case:${newCase.caseId}`).emit("ai_triage_completed", {
              caseId: newCase.caseId,
              triage: triageResult,
            });
          }
        }
      } catch (err) {
        console.warn("[CaseController] AI triage update error:", err);
      }
    });

    // Notify via Socket.IO if available
    const io = req.app.get("io");
    if (io) {
      io.emit("new_rescue_case", {
        case: newCase,
        notification: {
          category: "ACTION_REQUIRED",
          priority: newCase.priority === "critical" ? "HIGH" : "NORMAL",
          type: "RESCUE_REQUEST",
          title: `🚨 New Rescue Request #${newCase.caseNumber}`,
          body: `${newCase.breed || newCase.animalType.toUpperCase()}: ${newCase.condition || "Rescue required"} at ${newCase.generalLocation || newCase.exactLocation}`,
          caseId: newCase.caseId,
        },
      });
      if (newCase.assignedNgoId) {
        io.to(`ngo:${newCase.assignedNgoId}`).emit("case_assigned", {
          case: newCase,
          notification: {
            category: "ACTION_REQUIRED",
            priority: "HIGH",
            type: "RESCUE_DISPATCH",
            title: `🚨 Rescue Request Assigned #${newCase.caseNumber}`,
            body: `Your organization was dispatched to a rescue case at ${newCase.generalLocation || newCase.exactLocation}. Please review and respond within 15 minutes.`,
            caseId: newCase.caseId,
          },
        });
      }
    }

    return res.status(201).json({ success: true, case: newCase });
  } catch (err: any) {
    console.error("[CaseController] Create error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Failed to create case" });
  }
}

/**
 * GET /api/cases - List rescue cases
 */
export async function getCasesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { role } = await getUserProfileRole(userId);
    const targetNgoId = typeof req.query.ngoId === "string" ? req.query.ngoId : (role === "ngo" ? "ngo-greater-noida-rescuers" : undefined);

    const cases = await getCasesForUser(userId, role, targetNgoId);
    const filteredCases = cases.map((c) => filterCaseByInformationTier(c, role, userId));

    return res.json({ success: true, cases: filteredCases });
  } catch (err: any) {
    console.error("[CaseController] Get cases error:", err);
    return res.status(500).json({ success: false, message: "Failed to retrieve cases" });
  }
}

/**
 * GET /api/cases/:caseId - Get single case details
 */
export async function getCaseDetailsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const caseId = req.params.caseId as string;
    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }
    const userId = req.userId;

    const caseItem = await getCaseById(caseId);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Rescue case not found" });
    }

    let role = "citizen";
    if (userId) {
      const prof = await getUserProfileRole(userId);
      role = prof.role;
    }

    const filtered = filterCaseByInformationTier(caseItem, role, userId);
    return res.json({ success: true, case: filtered });
  } catch (err: any) {
    console.error("[CaseController] Get details error:", err);
    return res.status(500).json({ success: false, message: "Failed to retrieve case details" });
  }
}

/**
 * PATCH /api/cases/:caseId/status - Transition case status
 */
export async function updateStatusHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const caseId = req.params.caseId as string;
    const { status, reason, metadata } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!caseId || !status) {
      return res.status(400).json({ success: false, message: "caseId and status are required" });
    }

    const { role, fullName } = await getUserProfileRole(userId);
    if (role === "citizen" || role === "user") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Citizen reporters cannot directly modify operational case status.",
      });
    }

    const actorRole = (role === "admin" ? "ADMIN" : role === "ngo" ? "NGO" : role === "volunteer" ? "VOLUNTEER" : role === "vet" ? "VET" : "REPORTER") as any;

    const result = await transitionCaseStatus(
      caseId,
      status as CaseStatus,
      { actorId: userId, actorRole, actorName: fullName },
      reason,
      metadata
    );

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    // Emit Socket.IO event to active rooms
    const io = req.app.get("io");
    if (io) {
      io.to(`case:${caseId}`).emit("case_status_updated", {
        caseId,
        status,
        case: result.case,
      });
    }

    return res.json({ success: true, case: result.case });
  } catch (err: any) {
    console.error("[CaseController] Status update error:", err);
    return res.status(500).json({ success: false, message: "Failed to update case status" });
  }
}

/**
 * POST /api/cases/:caseId/accept - NGO accepts case
 */
export async function acceptCaseHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const caseId = req.params.caseId as string;
    const { ngoId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    const { fullName } = await getUserProfileRole(userId);
    const effectiveNgoId = ngoId || "ngo-greater-noida-rescuers";

    const result = await acceptCaseByNgo(caseId, effectiveNgoId, {
      actorId: userId,
      actorName: fullName,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`case:${caseId}`).emit("case_accepted", { caseId, case: result.case });
      if (result.case?.reporterId) {
        io.to(`user:${result.case.reporterId}`).emit("notification", {
          category: "INFORMATIONAL",
          priority: "NORMAL",
          type: "CASE_ACCEPTED",
          title: "🚨 Rescue Accepted",
          body: `An NGO has accepted your rescue case #${result.case.caseNumber}. Help is being dispatched.`,
          caseId,
        });
      }
    }

    return res.json({ success: true, case: result.case });
  } catch (err: any) {
    console.error("[CaseController] Accept error:", err);
    return res.status(500).json({ success: false, message: "Failed to accept case" });
  }
}

/**
 * POST /api/cases/:caseId/reject - NGO rejects case (triggers auto-escalation)
 */
export async function rejectCaseHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const caseId = req.params.caseId as string;
    const { ngoId, reason } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    const { fullName } = await getUserProfileRole(userId);
    const effectiveNgoId = ngoId || "ngo-greater-noida-rescuers";

    const result = await rejectCaseByNgo(
      caseId,
      effectiveNgoId,
      { actorId: userId, actorName: fullName },
      reason || "capacity"
    );

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`case:${caseId}`).emit("case_escalated", {
        caseId,
        case: result.case,
        reporterNotification: result.reporterNotification,
      });
      if (result.case?.reporterId) {
        io.to(`user:${result.case.reporterId}`).emit("case_escalated", {
          caseId,
          case: result.case,
          notification: result.reporterNotification,
        });
      }
    }

    return res.json({
      success: true,
      case: result.case,
      reporterNotification: result.reporterNotification,
    });
  } catch (err: any) {
    console.error("[CaseController] Reject error:", err);
    return res.status(500).json({ success: false, message: "Failed to reject case" });
  }
}

/**
 * POST /api/cases/:caseId/reopen - Reopen resolved case
 */
export async function reopenCaseHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const caseId = req.params.caseId as string;
    const { reason } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    const { role, fullName } = await getUserProfileRole(userId);

    const result = await reopenCase(
      caseId,
      {
        actorId: userId,
        actorRole: (role === "ngo" ? "NGO" : role === "admin" ? "ADMIN" : "REPORTER") as any,
        actorName: fullName,
      },
      reason || "Case reopened"
    );

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.json({ success: true, case: result.case });
  } catch (err: any) {
    console.error("[CaseController] Reopen error:", err);
    return res.status(500).json({ success: false, message: "Failed to reopen case" });
  }
}

/**
 * GET /api/cases/:caseId/timeline - Get immutable audit trail
 */
export async function getTimelineHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const caseId = req.params.caseId as string;
    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    const allEvents = await readTimeline();
    const caseEvents = allEvents.filter((e) => e.caseId === caseId);

    return res.json({ success: true, timeline: caseEvents });
  } catch (err: any) {
    console.error("[CaseController] Timeline error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch case timeline" });
  }
}

/**
 * POST /api/cases/sync-offline-status - Offline field updates queue sync
 */
export async function syncOfflineStatusHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: "Updates array is required" });
    }

    const result = await syncOfflineStatusUpdates(updates);
    return res.json({ ...result });
  } catch (err: any) {
    console.error("[CaseController] Sync error:", err);
    return res.status(500).json({ success: false, message: "Failed to sync offline updates" });
  }
}

/**
 * GET /api/cases/volunteers/list - List rescue volunteers
 */
export async function getVolunteersListHandler(_req: AuthenticatedRequest, res: Response) {
  try {
    const volunteers = await readVolunteers();
    return res.json({ success: true, volunteers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to load volunteers" });
  }
}

/**
 * GET /api/cases/fosters/match/:caseId - Match fosters with transparent criteria
 */
export async function matchFostersHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId } = req.params;
    const caseItem = await getCaseById(caseId as string);

    const matches = await matchFostersForCase({
      animalType: caseItem?.animalType || "dog",
      medicalRequired: caseItem?.status === "MEDICAL_CARE" || caseItem?.priority === "critical",
      requiresEmergency: caseItem?.priority === "critical" || caseItem?.priority === "urgent",
    });

    return res.json({ success: true, matches });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to match fosters" });
  }
}

/**
 * POST /api/cases/:caseId/assign-volunteer - Assign volunteer to case
 */
export async function assignVolunteerHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId } = req.params;
    const { assignedToUserId, assignedToName, role = "RESCUE", notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { role: userRole } = await getUserProfileRole(userId);
    if (userRole !== "ngo" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only NGO coordinators and administrators can assign volunteers.",
      });
    }

    if (!assignedToUserId || !assignedToName) {
      return res.status(400).json({ success: false, message: "Volunteer details required" });
    }

    const assignment = await createCaseAssignment({
      caseId: caseId as string,
      assignedToUserId,
      assignedToName,
      role,
      notes,
    });

    // Update case status if moving to VOLUNTEER_ASSIGNED
    await transitionCaseStatus(
      caseId as string,
      role === "FOSTER" ? "FOSTER_ASSIGNED" : "VOLUNTEER_ASSIGNED",
      { actorId: userId, actorRole: (userRole === "admin" ? "ADMIN" : "NGO") as any, actorName: "NGO Operations" },
      `Assigned ${role.toLowerCase()} volunteer ${assignedToName}`
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`case:${caseId}`).emit("volunteer_assigned", {
        caseId,
        assignment,
        notification: {
          category: "ACTION_REQUIRED",
          priority: "HIGH",
          type: role === "FOSTER" ? "FOSTER_REQUEST" : "RESCUE_ASSIGNMENT",
          title: role === "FOSTER" ? `🏠 Foster Assignment` : `🦺 Rescue Assignment`,
          body: `Assigned volunteer ${assignedToName} to case #${caseId}.`,
          caseId,
        },
      });
      io.to(`user:${assignedToUserId}`).emit("notification", {
        category: "ACTION_REQUIRED",
        priority: "HIGH",
        type: role === "FOSTER" ? "FOSTER_REQUEST" : "RESCUE_ASSIGNMENT",
        title: role === "FOSTER" ? `🏠 New Foster Assignment` : `🦺 New Rescue Assignment`,
        body: `You have been assigned to case #${caseId}. Please review the case details in your operations console.`,
        caseId,
      });
    }

    return res.status(201).json({ success: true, assignment });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to assign volunteer" });
  }
}

/**
 * GET /api/cases/vets/clinics - List partner vet clinics
 */
export async function getVetClinicsHandler(_req: AuthenticatedRequest, res: Response) {
  try {
    const clinics = await readVetClinics();
    return res.json({ success: true, clinics });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to load veterinary clinics" });
  }
}

/**
 * GET /api/cases/vets/snapshot/:caseId - Generate structured case snapshot for vet
 */
export async function getVetSnapshotHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId } = req.params;
    const snapshot = await generateVetCaseSnapshot(caseId as string);

    if (!snapshot) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    return res.json({ success: true, snapshot });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to generate vet snapshot" });
  }
}

/**
 * POST /api/cases/:caseId/vet-referral - Create vet referral
 */
export async function createVetReferralHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId } = req.params;
    const { clinicId, paymentResponsibility = "ngo", requestedTreatment, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { role: userRole } = await getUserProfileRole(userId);
    if (userRole !== "ngo" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only NGO coordinators and administrators can create veterinary referrals.",
      });
    }

    if (!clinicId) {
      return res.status(400).json({ success: false, message: "clinicId is required" });
    }

    const referral = await createVetReferral({
      caseId: caseId as string,
      clinicId,
      referredByNgoId: "ngo-greater-noida-rescuers",
      paymentResponsibility,
      requestedTreatment,
      notes,
    });

    if (!referral) {
      return res.status(400).json({ success: false, message: "Failed to create referral" });
    }

    // Transition case to MEDICAL_REQUIRED or MEDICAL_CARE
    await transitionCaseStatus(
      caseId as string,
      "MEDICAL_CARE",
      { actorId: userId, actorRole: (userRole === "admin" ? "ADMIN" : "NGO") as any, actorName: "NGO Operations" },
      `Referred to ${referral.clinicName || clinicId}. Payment responsibility: ${paymentResponsibility}`
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`case:${caseId}`).emit("medical_referral_created", {
        caseId,
        referral,
        notification: {
          category: "ACTION_REQUIRED",
          priority: "HIGH",
          type: "MEDICAL_REQUEST",
          title: `🏥 Veterinary Referral Created`,
          body: `Case referred to ${referral.clinicName || clinicId}. Payment responsibility: ${paymentResponsibility}`,
          caseId,
        },
      });
    }

    return res.status(201).json({ success: true, referral });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to create vet referral" });
  }
}

/**
 * PATCH /api/cases/:caseId/severity - Human confirms AI severity (Section 4.2 / Section 8)
 */
export async function confirmSeverityHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const caseId = req.params.caseId as string;
    const { confirmedSeverity } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!confirmedSeverity || !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(confirmedSeverity)) {
      return res.status(400).json({
        success: false,
        message: "Invalid confirmedSeverity value. Must be LOW, MEDIUM, HIGH, or CRITICAL",
      });
    }

    const { role, fullName } = await getUserProfileRole(userId);
    const actorRole = (role === "admin" ? "ADMIN" : role === "ngo" ? "NGO" : "VOLUNTEER") as any;

    const result = await confirmCaseSeverity(caseId, confirmedSeverity, {
      actorId: userId,
      actorRole,
      actorName: fullName,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`case:${caseId}`).emit("case_severity_confirmed", {
        caseId,
        confirmedSeverity,
        case: result.case,
        notification: {
          category: "INFORMATIONAL",
          priority: "NORMAL",
          type: "CASE_SEVERITY_CONFIRMED",
          title: `Medical Severity Confirmed: ${confirmedSeverity}`,
          body: `Medical severity confirmed by ${fullName || "coordinator"}.`,
          caseId,
        },
      });
    }

    return res.json({ success: true, case: result.case });
  } catch (err: any) {
    console.error("[CaseController] Severity confirm error:", err);
    return res.status(500).json({ success: false, message: "Failed to confirm case severity" });
  }
}

/**
 * POST /api/cases/:caseId/outcome - Record final case outcome (Section 4.2 / Section 11)
 */
export async function recordOutcomeHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const caseId = req.params.caseId as string;
    const { outcome, reason, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!outcome || !["RESOLVED", "ADOPTED", "REUNITED", "DECEASED", "CANCELLED"].includes(outcome)) {
      return res.status(400).json({ success: false, message: "Invalid outcome value" });
    }

    const { role, fullName } = await getUserProfileRole(userId);

    // Extra authorization check for DECEASED (NGO, VET, or ADMIN only)
    if (outcome === "DECEASED" && role !== "ngo" && role !== "vet" && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only NGO coordinators, veterinarians, or administrators can record DECEASED outcome.",
      });
    }

    const actorRole = (role === "admin" ? "ADMIN" : role === "ngo" ? "NGO" : role === "vet" ? "VET" : "VOLUNTEER") as any;

    const result = await transitionCaseStatus(
      caseId,
      outcome === "DECEASED" ? "DECEASED" : outcome === "CANCELLED" ? "CANCELLED" : "RESOLVED",
      { actorId: userId, actorRole, actorName: fullName },
      reason || `Case outcome recorded as ${outcome}`,
      { outcome, notes, recordedAt: new Date().toISOString() }
    );

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const io = req.app.get("io");
    if (io && result.case) {
      if (outcome === "DECEASED") {
        const sensitiveCopy = getDeceasedNotificationCopy(result.case.caseNumber);
        io.to(`case:${caseId}`).emit("deceased_notification", {
          caseId,
          ...sensitiveCopy,
          category: "INFORMATIONAL",
          priority: "NORMAL",
          type: "DECEASED",
        });
        if (result.case.reporterId) {
          io.to(`user:${result.case.reporterId}`).emit("notification", {
            ...sensitiveCopy,
            category: "INFORMATIONAL",
            priority: "NORMAL",
            type: "DECEASED",
            caseId,
          });
        }
      } else {
        io.to(`case:${caseId}`).emit("case_resolved", {
          caseId,
          outcome,
          case: result.case,
          notification: {
            category: "INFORMATIONAL",
            priority: "NORMAL",
            type: "CASE_RESOLVED",
            title: `Case Resolved — #${result.case.caseNumber}`,
            body: `Case outcome recorded as ${outcome}.`,
            caseId,
          },
        });
        if (result.case.reporterId) {
          io.to(`user:${result.case.reporterId}`).emit("notification", {
            category: "INFORMATIONAL",
            priority: "NORMAL",
            type: "CASE_RESOLVED",
            title: `Case Outcome — #${result.case.caseNumber}`,
            body: `Your reported case has reached outcome: ${outcome}. Thank you for helping give them a chance!`,
            caseId,
          });
        }
      }
    }

    return res.json({ success: true, case: result.case });
  } catch (err: any) {
    console.error("[CaseController] Outcome error:", err);
    return res.status(500).json({ success: false, message: "Failed to record case outcome" });
  }
}

