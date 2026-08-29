import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  sendMessage,
  getUnreadCount,
  getConversation,
  markAsRead,
  getConversations,
  getUnreadMessages,
} from "../controllers/messageController";

const router = Router();

router.post("/", requireAuth, sendMessage);
router.get("/unread", requireAuth, getUnreadCount);
router.get("/unread-messages", requireAuth, getUnreadMessages);
router.get("/conversations", requireAuth, getConversations);
router.get("/report/:reportId/conversation/:otherUserId", requireAuth, getConversation);
router.post("/report/:reportId/read/:senderId", requireAuth, markAsRead);

export default router;
