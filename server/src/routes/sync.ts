import { Router } from "express";
import { syncReportsHandler, syncStatusUpdatesHandler } from "../controllers/syncController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/reports", requireAuth, syncReportsHandler);
router.post("/status-updates", requireAuth, syncStatusUpdatesHandler);

export default router;
