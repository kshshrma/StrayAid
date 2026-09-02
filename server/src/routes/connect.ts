import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  listOrganizations,
  getOrganizationProfile,
  submitOrganizationRegistration,
  listHelplines,
  startOrGetNGOConversation,
  getMyNGOConversations,
  getNGOInbox,
  getNGOConversationDetails,
  sendNGOMessage,
  updateNGOConversationRescueStatus,
} from "../controllers/connectController";

const router = Router();

// Public / Directory Routes
router.get("/organizations", listOrganizations);
router.get("/organizations/:id", getOrganizationProfile);
router.get("/helplines", listHelplines);

// Authenticated NGO Registration & Chat Routes
router.post("/organizations/register", requireAuth, submitOrganizationRegistration);
router.post("/chat/start", requireAuth, startOrGetNGOConversation);
router.get("/chat/my-conversations", requireAuth, getMyNGOConversations);
router.get("/chat/ngo-inbox/:organizationId", requireAuth, getNGOInbox);
router.get("/chat/conversations/:id", requireAuth, getNGOConversationDetails);
router.post("/chat/conversations/:id/messages", requireAuth, sendNGOMessage);
router.patch("/chat/conversations/:id/status", requireAuth, updateNGOConversationRescueStatus);

export default router;
