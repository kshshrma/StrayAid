import { Router } from "express";

import {
  createAssignment,
  updateAssignment,
} from "../controllers/rescueController";

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
 */
router.patch(
  "/assignments/:id",
  updateAssignment
);

export default router;