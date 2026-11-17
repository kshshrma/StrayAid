import { Router } from "express";

import {
  createAssignment,
  getMyAssignments,
  updateAssignment,
  createBotRescueRequest,
  getMyRescueHistory,
  getMyGuardianStats,
  getMyAcceptedRescues,
} from "../controllers/rescueController";

import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * Test rescue API
 */
router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Rescue API is working",
  });
});

/**
 * Create rescue request from automated Connect chatbot
 * Authentication required
 */
router.post(
  "/bot-request",
  requireAuth,
  createBotRescueRequest
);

/**
 * Create rescue assignment
 */
router.post(
  "/assignments",
  createAssignment
);

/**
 * Get rescue assignments
 * for the logged-in Guardian
 *
 * Authentication required
 */
router.get(
  "/assignments",
  requireAuth,
  getMyAssignments
);

/**
 * Accept, update stage, or complete rescue assignment
 *
 * Authentication required
 */
router.patch(
  "/assignments/:id",
  requireAuth,
  updateAssignment
);

/**
 * Individual Guardian rescue history
 * Only completed rescues by the authenticated Guardian
 */
router.get(
  "/my-history",
  requireAuth,
  getMyRescueHistory
);

/**
 * Individual Guardian rescue and lives saved statistics
 */
router.get(
  "/my-stats",
  requireAuth,
  getMyGuardianStats
);

/**
 * Individual Guardian's claimed and completed rescues
 */
router.get(
  "/my-rescues",
  requireAuth,
  getMyAcceptedRescues
);

export default router;