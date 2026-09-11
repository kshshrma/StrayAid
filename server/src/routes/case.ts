import { Router } from "express";
import {
  createCaseHandler,
  getCasesHandler,
  getCaseDetailsHandler,
  updateStatusHandler,
  acceptCaseHandler,
  rejectCaseHandler,
  reopenCaseHandler,
  getTimelineHandler,
  syncOfflineStatusHandler,
  getVolunteersListHandler,
  matchFostersHandler,
  assignVolunteerHandler,
  getVetClinicsHandler,
  getVetSnapshotHandler,
  createVetReferralHandler,
} from "../controllers/caseController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// 1. Volunteer & Vet Helper endpoints (Must be before parameterized :caseId)
router.get("/volunteers/list", requireAuth, getVolunteersListHandler);
router.get("/fosters/match/:caseId", requireAuth, matchFostersHandler);
router.get("/vets/clinics", requireAuth, getVetClinicsHandler);
router.get("/vets/snapshot/:caseId", requireAuth, getVetSnapshotHandler);

// 2. Offline sync
router.post("/sync-offline-status", requireAuth, syncOfflineStatusHandler);

// 3. Main Case CRUD
router.post("/", requireAuth, createCaseHandler);
router.get("/", requireAuth, getCasesHandler);
router.get("/:caseId", requireAuth, getCaseDetailsHandler);

// 4. Status & Actions
router.patch("/:caseId/status", requireAuth, updateStatusHandler);
router.post("/:caseId/accept", requireAuth, acceptCaseHandler);
router.post("/:caseId/reject", requireAuth, rejectCaseHandler);
router.post("/:caseId/reopen", requireAuth, reopenCaseHandler);
router.get("/:caseId/timeline", requireAuth, getTimelineHandler);

// 5. Assignment & Referrals
router.post("/:caseId/assign-volunteer", requireAuth, assignVolunteerHandler);
router.post("/:caseId/vet-referral", requireAuth, createVetReferralHandler);

export default router;
