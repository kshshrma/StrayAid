import { Router } from "express";

import {
  createAssignment,
} from "../controllers/rescueController";

const router = Router();

router.post(
  "/assignments",
  createAssignment
);

export default router;