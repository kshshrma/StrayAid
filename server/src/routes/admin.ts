import { Router } from "express";
import {
  getUnverifiedGuardians,
  verifyGuardian,
  getActiveReports,
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

export default router;
