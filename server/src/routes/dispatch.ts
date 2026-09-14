import { Router } from "express";
import {
  triggerDispatchHandler,
  escalateDispatchHandler,
  getNearbyGuardiansHandler,
  respondGuardianDispatchHandler,
} from "../controllers/dispatchController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/guardians/nearby", requireAuth, getNearbyGuardiansHandler);
router.post("/:caseId", requireAuth, triggerDispatchHandler);
router.post("/:caseId/escalate", requireAuth, escalateDispatchHandler);
router.patch("/:caseId/guardian/respond", requireAuth, respondGuardianDispatchHandler);

export default router;
