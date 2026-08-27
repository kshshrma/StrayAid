import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  sendMessage,
  getUnreadCount,
  getConversation,
  markAsRead,
  getConversations,
} from "../controllers/messageController";

const router = Router();

router.post("/", requireAuth, sendMessage);
router.get("/unread", requireAuth, getUnreadCount);
router.get("/conversations", requireAuth, getConversations);
router.get("/report/:reportId/conversation/:otherUserId", requireAuth, getConversation);
router.post("/report/:reportId/read/:senderId", requireAuth, markAsRead);

export default router;
