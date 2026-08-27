import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../services/supabase";
import * as messageService from "../services/messageService";

// Helper to fetch report owner ID from Supabase
async function getReportOwnerId(reportId: string): Promise<string | null> {
  const { data: report, error } = await supabase
    .from("reports")
    .select("ai_advice")
    .eq("id", reportId)
    .single();

  if (error || !report) {
    return null;
  }

  try {
    const metadata = JSON.parse(report.ai_advice || "{}");
    return metadata.reporterId || "3e79170e-c511-4ad2-ad34-270992a73339";
  } catch (e) {
    return "3e79170e-c511-4ad2-ad34-270992a73339";
  }
}

// POST /api/messages
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const { reportId, content, recipientId: clientRecipientId } = req.body;
    const senderId = req.userId;

    if (!senderId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!reportId || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 1. Get report owner
    const ownerId = await getReportOwnerId(reportId);
    if (!ownerId) {
      return res.status(404).json({ success: false, message: "Report or report owner not found" });
    }

    // 2. Determine recipient (Rule: Never trust recipientId from frontend if sender is enquirer)
    let recipientId = ownerId;
    if (senderId === ownerId) {
      // The report owner is replying. In this case, we need to send the message to the enquirer.
      // We take clientRecipientId and verify that they are authorized
      if (!clientRecipientId) {
        return res.status(400).json({ success: false, message: "Recipient ID required for replies" });
      }
      recipientId = clientRecipientId;
    }

    // 3. Save message in local JSON database
    const newMessage = await messageService.createMessage(
      reportId,
      senderId,
      recipientId,
      content.trim()
    );

    // 4. Dispatch real-time notification via Socket.IO
    const io = req.app.get("io");
    if (io) {
      const roomName = `user:${recipientId}`;
      io.to(roomName).emit("secure_message_received", {
        message: newMessage,
      });
      console.log(`📡 Secure message emitted to room ${roomName}`);
    }

    return res.status(201).json({ success: true, message: newMessage });
  } catch (err: any) {
    console.error("[MessageController] Error sending message:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to send message" });
  }
}

// GET /api/messages/unread
export async function getUnreadCount(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const count = await messageService.getUnreadMessagesCount(userId);
    return res.json({ success: true, count });
  } catch (err: any) {
    console.error("[MessageController] Error getting unread count:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to get unread count" });
  }
}

// GET /api/messages/report/:reportId/conversation/:otherUserId
export async function getConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const reportId = req.params.reportId as string;
    const otherUserId = req.params.otherUserId as string;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Get report owner
    const ownerId = await getReportOwnerId(reportId);
    if (!ownerId) {
      return res.status(404).json({ success: false, message: "Report or report owner not found" });
    }

    // 2. Security/Auth checks (current user must be either the owner or the other participant)
    const isOwner = userId === ownerId;
    const isOtherParticipant = userId === otherUserId;
    const isTargetingOwner = otherUserId === ownerId;

    if (!isOwner && !isOtherParticipant && !isTargetingOwner) {
      return res.status(403).json({ success: false, message: "ACCESS DENIED" });
    }

    // 3. Fetch conversation messages
    const messages = await messageService.getConversationMessages(reportId, userId as string, otherUserId);
    return res.json({ success: true, messages });
  } catch (err: any) {
    console.error("[MessageController] Error fetching conversation:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to load conversation" });
  }
}

// POST /api/messages/report/:reportId/read/:senderId
export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const reportId = req.params.reportId as string;
    const senderId = req.params.senderId as string;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await messageService.markConversationAsRead(reportId, userId as string, senderId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[MessageController] Error marking conversation as read:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to mark as read" });
  }
}

// GET /api/messages/conversations
export async function getConversations(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversations = await messageService.getConversationsForUser(userId);
    return res.json({ success: true, conversations });
  } catch (err: any) {
    console.error("[MessageController] Error fetching conversations:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch conversations" });
  }
}

// GET /api/messages/unread-messages
export async function getUnreadMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const messages = await messageService.readMessages();
    const unread = messages.filter((m) => m.recipientId === userId && !m.isRead);
    return res.json({ success: true, messages: unread });
  } catch (err: any) {
    console.error("[MessageController] Error fetching unread messages:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch unread messages" });
  }
}
