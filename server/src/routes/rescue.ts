import { Router } from "express";

import {
  createAssignment,
} from "../controllers/rescueController";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Rescue API is working",
  });
});

router.post(
  "/assignments",
  createAssignment
);

export default router;