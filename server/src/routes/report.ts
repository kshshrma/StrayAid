import { Router } from "express";
import { getImmediateRescues, getNearbyReports } from "../controllers/reportController";
import {
  createLostFoundReport,
  submitSighting,
  getSightings,
  getPossibleMatches,
  dismissMatch,
  markAsReunited,
  getMyReports,
} from "../controllers/lostFoundController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/immediate", requireAuth, getImmediateRescues);
router.get("/nearby", requireAuth, getNearbyReports);
router.get("/my", requireAuth, getMyReports);

router.post("/lost-found", requireAuth, createLostFoundReport);
router.post("/:reportId/sightings", requireAuth, submitSighting);
router.get("/:reportId/sightings", requireAuth, getSightings);
router.get("/:reportId/matches", requireAuth, getPossibleMatches);
router.post("/:reportId/matches/:matchId/dismiss", requireAuth, dismissMatch);
router.post("/:reportId/reunited", requireAuth, markAsReunited);

export default router;
