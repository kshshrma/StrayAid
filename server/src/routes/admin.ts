import { Router } from "express";
import {
  getUnverifiedGuardians,
  verifyGuardian,
  getActiveReports,
  getAvailableGuardians,
  overrideDispatch,
  updateReportStatusManually,
  getAllNgosHandler,
  approveNgoHandler,
  rejectNgoHandler,
  suspendNgoHandler,
  updateNgoCapacityHandler,
} from "../controllers/adminController";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// Apply auth and role-based checks globally on these routes
router.use(requireAuth);
router.use(requireAdmin);

/**
 * Fetch list of unverified Guardians
 */
router.get("/guardians/unverified", getUnverifiedGuardians);

/**
 * Verify a Guardian
 */
router.patch("/guardians/:id/verify", verifyGuardian);

/**
 * Fetch list of active/uncompleted emergency reports
 */
router.get("/reports/active", getActiveReports);

/**
 * Fetch list of verified and available Guardians
 */
router.get("/guardians/available", getAvailableGuardians);

/**
 * Manually assign a Guardian to a report (override dispatch)
 */
router.post("/dispatch/override", overrideDispatch);

/**
 * Manually transition a report status
 */
router.patch("/reports/:reportId/status", updateReportStatusManually);

/**
 * Fetch all registered NGOs with verification and capacity statuses
 */
router.get("/ngos", getAllNgosHandler);

/**
 * Verify and approve an NGO
 */
router.patch("/ngos/:id/approve", approveNgoHandler);

/**
 * Reject an NGO registration
 */
router.patch("/ngos/:id/reject", rejectNgoHandler);

/**
 * Suspend an NGO from active operations
 */
router.patch("/ngos/:id/suspend", suspendNgoHandler);

/**
 * Update NGO capacity / emergency availability
 */
router.patch("/ngos/:id/capacity", updateNgoCapacityHandler);

export default router;
