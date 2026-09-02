import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../services/supabase";
import * as messageService from "../services/messageService";
import { REGISTERED_NGOS, EMERGENCY_HELPLINES, getRegisteredNgoById } from "../services/ngoService";

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
    return metadata.reporterId || "6c4c4175-c2c4-470b-a5d5-c86639f3e949";
  } catch (e) {
    return "6c4c4175-c2c4-470b-a5d5-c86639f3e949";
  }
}

// GET /api/messages/ngos
export async function getNgosList(_req: AuthenticatedRequest, res: Response) {
  try {
    return res.json({
      success: true,
      ngos: REGISTERED_NGOS,
      helplines: EMERGENCY_HELPLINES,
    });
  } catch (err: any) {
    console.error("[MessageController] Error loading NGOs list:", err);
    return res.status(500).json({ success: false, message: "Failed to load NGOs list" });
  }
}

// GET /api/messages/inbox
export async function getInbox(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversations = await messageService.getConversationsForUser(userId);
    return res.json({ success: true, conversations });
  } catch (err: any) {
    console.error("[MessageController] Error loading inbox:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to load inbox" });
  }
}

// POST /api/messages/ngo/start
export async function startNgoConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const { organizationId, initialMessage } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!organizationId) {
      return res.status(400).json({ success: false, message: "organizationId is required" });
    }

    const ngo = getRegisteredNgoById(organizationId);
    if (!ngo) {
      return res.status(404).json({ success: false, message: "Registered NGO not found" });
    }

    // Get or create conversation between current user and authorized NGO representative account
    const { conversation } = await messageService.getOrCreateNgoConversation(userId, organizationId);

    let createdMessage = null;
    if (initialMessage && initialMessage.trim()) {
      createdMessage = await messageService.createMessage(
        conversation.id,
        "",
        userId,
        ngo.representativeUserId,
        initialMessage.trim()
      );

      const io = req.app.get("io");
      if (io) {
        io.to(`conversation:${conversation.id}`).emit("new_message", { message: createdMessage });
        io.to(`user:${ngo.representativeUserId}`).emit("secure_message_received", { message: createdMessage });
      }
    }

    const messages = await messageService.getConversationMessages(conversation.id);

    return res.status(200).json({
      success: true,
      conversation,
      ngo: {
        id: ngo.id,
        name: ngo.name,
        isVerified: ngo.isVerified,
        availability: ngo.availability,
        location: ngo.location,
        categories: ngo.categories,
        description: ngo.description,
        phone: ngo.phone,
        activeMembers: ngo.activeMembers,
        serviceArea: ngo.serviceArea,
      },
      messages,
      createdMessage,
    });
  } catch (err: any) {
    console.error("[MessageController] Error starting NGO conversation:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to start NGO conversation" });
  }
}

// POST /api/messages/start (Lost & Found report conversation)
export async function startConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const { reportId, content } = req.body;
    const senderId = req.userId;

    if (!senderId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!reportId || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 1. Get report owner (Derive it server-side, never trust client recipientId)
    const ownerId = await getReportOwnerId(reportId);
    if (!ownerId) {
      return res.status(404).json({ success: false, message: "Report or report owner not found" });
    }

    if (senderId === ownerId) {
      return res.status(400).json({ success: false, message: "You cannot start a conversation on your own report" });
    }

    // 2. Get or create conversation (participant1 = Owner, participant2 = Enquirer)
    const conversation = await messageService.getOrCreateConversation(reportId, ownerId, senderId);

    // 3. Create initial message
    const message = await messageService.createMessage(
      conversation.id,
      reportId,
      senderId,
      ownerId,
      content.trim()
    );

    // 4. Emit to owner room via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${ownerId}`).emit("secure_message_received", { message });
    }

    return res.status(201).json({ success: true, conversation, message });
  } catch (err: any) {
    console.error("[MessageController] Error starting conversation:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to start conversation" });
  }
}

// GET /api/messages/conversations/:conversationId
export async function getConversationDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const conversationId = req.params.conversationId as string;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversation = await messageService.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Security check: Only participants can retrieve messages
    if (userId !== conversation.participant1Id && userId !== conversation.participant2Id) {
      return res.status(403).json({ success: false, message: "Forbidden: You are not a participant in this conversation" });
    }

    // Load messages
    const messages = await messageService.getConversationMessages(conversationId);

    let ngoDetails = null;
    if (conversation.type === "ngo" && conversation.organizationId) {
      const ngo = getRegisteredNgoById(conversation.organizationId);
      if (ngo) {
        ngoDetails = {
          id: ngo.id,
          name: ngo.name,
          isVerified: ngo.isVerified,
          availability: ngo.availability,
          location: ngo.location,
          categories: ngo.categories,
          description: ngo.description,
          phone: ngo.phone,
          activeMembers: ngo.activeMembers,
          serviceArea: ngo.serviceArea,
        };
      }
    }

    return res.json({ success: true, conversation, messages, ngoDetails });
  } catch (err: any) {
    console.error("[MessageController] Error loading conversation details:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to load conversation" });
  }
}

// POST /api/messages/conversations/:conversationId/messages
export async function sendReplyMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const conversationId = req.params.conversationId as string;
    const { content, metadata } = req.body;
    const senderId = req.userId;

    if (!senderId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Message content cannot be empty" });
    }

    const conversation = await messageService.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Security check: Only participants can send messages
    if (senderId !== conversation.participant1Id && senderId !== conversation.participant2Id) {
      return res.status(403).json({ success: false, message: "Forbidden: You are not a participant in this conversation" });
    }

    const recipientId = senderId === conversation.participant1Id ? conversation.participant2Id : conversation.participant1Id;

    // Create message with optional report attachment metadata
    const message = await messageService.createMessage(
      conversationId,
      conversation.reportId || "",
      senderId,
      recipientId,
      content.trim(),
      metadata
    );

    // Emit to conversation room (realtime chat screen) and user room (unread badges/alerts)
    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversationId}`).emit("new_message", { message });
      io.to(`user:${recipientId}`).emit("secure_message_received", { message });
    }

    return res.status(201).json({ success: true, message });
  } catch (err: any) {
    console.error("[MessageController] Error sending reply message:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to send message" });
  }
}

// POST /api/messages/conversations/:conversationId/read
export async function markConversationRead(req: AuthenticatedRequest, res: Response) {
  try {
    const conversationId = req.params.conversationId as string;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversation = await messageService.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Security check
    if (userId !== conversation.participant1Id && userId !== conversation.participant2Id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await messageService.markConversationAsRead(conversationId, userId);

    // Notify room of read confirmations
    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversationId}`).emit("messages_read", { conversationId, readerId: userId });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[MessageController] Error marking conversation read:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to mark read" });
  }
}

// POST /api/messages/conversations/:conversationId/block
export async function blockConversationParticipant(req: AuthenticatedRequest, res: Response) {
  try {
    const conversationId = req.params.conversationId as string;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversation = await messageService.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (userId !== conversation.participant1Id && userId !== conversation.participant2Id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, message: "Participant blocked successfully" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || "Failed to block participant" });
  }
}

// POST /api/messages/conversations/:conversationId/report
export async function reportMessageContent(req: AuthenticatedRequest, res: Response) {
  try {
    const conversationId = req.params.conversationId as string;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversation = await messageService.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (userId !== conversation.participant1Id && userId !== conversation.participant2Id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, message: "Message content reported successfully" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || "Failed to report content" });
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
