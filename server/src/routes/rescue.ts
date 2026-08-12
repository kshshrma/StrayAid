import { Router } from "express";

import {
  createAssignment,
  updateAssignment,
  getMyAssignments,
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
 * Accept or reject rescue assignment
 *
 * Authentication required
 */
router.get(
  "/assignments",
  requireAuth,
  getMyAssignments
);
router.patch(
  "/assignments/:id",
  requireAuth,
  updateAssignment
);

export default router;