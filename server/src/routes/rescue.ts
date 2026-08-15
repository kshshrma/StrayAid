import { Router } from "express";

import {
  createAssignment,
  getMyAssignments,
  updateAssignment,
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
 * Accept or reject rescue assignment
 *
 * Authentication required
 */
router.patch(
  "/assignments/:id",
  requireAuth,
  updateAssignment
);

export default router;