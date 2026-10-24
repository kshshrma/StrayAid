import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createOrUpdateConnectRequestHandler,
  updateConnectRequestHandler,
  getUserRequestsHandler,
  getRequestByIdHandler,
  getNgoRequestsHandler,
  updateNgoRequestHandler,
} from "../controllers/connectRequestController";

const router = Router();

// User endpoints
router.post("/requests", requireAuth, createOrUpdateConnectRequestHandler);
router.patch("/requests/:id", requireAuth, updateConnectRequestHandler);
router.get("/requests", requireAuth, getUserRequestsHandler);
router.get("/requests/:id", requireAuth, getRequestByIdHandler);

// NGO endpoints
router.get("/ngo/requests", requireAuth, getNgoRequestsHandler);
router.patch("/ngo/requests/:id", requireAuth, updateNgoRequestHandler);

export default router;
