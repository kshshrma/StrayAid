import { Router } from "express";
import { getImmediateRescues, getNearbyReports } from "../controllers/reportController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/immediate", requireAuth, getImmediateRescues);
router.get("/nearby", requireAuth, getNearbyReports);

export default router;
