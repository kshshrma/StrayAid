import { Router } from "express";
import {
  getUnverifiedGuardians,
  verifyGuardian,
  getActiveReports,
  getAvailableGuardians,
  overrideDispatch,
  updateReportStatusManually,
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

export default router;
