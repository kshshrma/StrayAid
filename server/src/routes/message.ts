import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getInbox,
  startConversation,
  getConversationDetails,
  sendReplyMessage,
  markConversationRead,
  blockConversationParticipant,
  reportMessageContent,
  getUnreadCount,
  getUnreadMessages,
} from "../controllers/messageController";

const router = Router();

router.get("/inbox", requireAuth, getInbox);
router.post("/start", requireAuth, startConversation);
router.get("/conversations/:conversationId", requireAuth, getConversationDetails);
router.post("/conversations/:conversationId/messages", requireAuth, sendReplyMessage);
router.post("/conversations/:conversationId/read", requireAuth, markConversationRead);
router.post("/conversations/:conversationId/block", requireAuth, blockConversationParticipant);
router.post("/conversations/:conversationId/report", requireAuth, reportMessageContent);
router.get("/unread", requireAuth, getUnreadCount);
router.get("/unread-messages", requireAuth, getUnreadMessages);

export default router;
