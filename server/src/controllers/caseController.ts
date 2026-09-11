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
  CaseStatus,
  PaymentResponsibility,
} from "../services/caseService";
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

    // Notify via Socket.IO if available
    const io = req.app.get("io");
    if (io) {
      io.emit("new_rescue_case", { case: newCase });
      if (newCase.assignedNgoId) {
        io.to(`ngo:${newCase.assignedNgoId}`).emit("case_assigned", { case: newCase });
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
    const actorRole = (role === "admin" ? "ADMIN" : role === "ngo" ? "NGO" : "VOLUNTEER") as any;

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
      io.to(`case:${caseId}`).emit("case_escalated", { caseId, case: result.case });
    }

    return res.json({ success: true, case: result.case });
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
      { actorId: req.userId || "system", actorRole: "NGO", actorName: "NGO Operations" },
      `Assigned ${role.toLowerCase()} volunteer ${assignedToName}`
    );

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
      { actorId: req.userId || "system", actorRole: "NGO", actorName: "NGO Operations" },
      `Referred to ${referral.clinicName}. Payment responsibility: ${paymentResponsibility}`
    );

    return res.status(201).json({ success: true, referral });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to create vet referral" });
  }
}
