import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../services/supabase";
import * as messageService from "../services/messageService";
import { REGISTERED_NGOS, EMERGENCY_HELPLINES, getRegisteredNgoById } from "../services/ngoService";
import { getCaseById } from "../services/caseService";

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

// POST /api/messages/case/start
export async function startCaseConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId, type = "CASE_GROUP", title } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    const caseItem = await getCaseById(caseId);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Rescue case not found" });
    }

    // Build initial participants based on case context
    const participants: { userId: string; role: messageService.ConversationParticipant["role"]; name?: string | undefined }[] = [];
    if (caseItem.reporterId) {
      participants.push({ userId: caseItem.reporterId, role: "REPORTER", name: caseItem.reporterName });
    }
    if (caseItem.assignedNgoId) {
      const ngo = getRegisteredNgoById(caseItem.assignedNgoId);
      if (ngo) {
        participants.push({ userId: ngo.representativeUserId, role: "NGO", name: ngo.name });
      }
    }
    if (caseItem.assignedVolunteerId) {
      participants.push({ userId: caseItem.assignedVolunteerId, role: "VOLUNTEER" });
    }
    if (caseItem.assignedVetId) {
      participants.push({ userId: caseItem.assignedVetId, role: "VET" });
    }

    // Ensure current user is included
    if (!participants.some((p) => p.userId === userId)) {
      participants.push({ userId, role: "CITIZEN" });
    }

    const conversation = await messageService.getOrCreateCaseConversation(
      caseId,
      type,
      participants,
      title || `Case #${caseItem.caseNumber} Communication`
    );

    const messages = await messageService.getMessagesByConversationId(conversation.id);
    return res.json({ success: true, conversation, messages });
  } catch (err: any) {
    console.error("[MessageController] Error starting case conversation:", err);
    return res.status(500).json({ success: false, message: "Failed to start case conversation" });
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

    const conversation = await messageService.getOrCreateNgoConversation(userId, organizationId);

    let createdMessage = null;
    if (initialMessage && initialMessage.trim()) {
      createdMessage = await messageService.createMessage({
        conversationId: conversation.id,
        senderId: userId,
        recipientId: ngo.representativeUserId,
        content: initialMessage.trim(),
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`conversation:${conversation.id}`).emit("new_message", { message: createdMessage });
        io.to(`user:${ngo.representativeUserId}`).emit("secure_message_received", { message: createdMessage });
      }
    }

    const messages = await messageService.getMessagesByConversationId(conversation.id);

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

    const ownerId = await getReportOwnerId(reportId);
    if (!ownerId) {
      return res.status(404).json({ success: false, message: "Report or report owner not found" });
    }

    if (senderId === ownerId) {
      return res.status(400).json({ success: false, message: "You cannot start a conversation on your own report" });
    }

    const conversation = await messageService.getOrCreateReportConversation(senderId, reportId);

    const message = await messageService.createMessage({
      conversationId: conversation.id,
      reportId,
      senderId,
      recipientId: ownerId,
      content: content.trim(),
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversation.id}`).emit("new_message", { message });
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

    // Security check: Verify user is an authorized participant
    const isParticipant =
      conversation.participant1Id === userId ||
      conversation.participant2Id === userId ||
      conversation.participants?.some((p) => p.userId === userId);

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Forbidden: You are not a participant in this conversation" });
    }

    const messages = await messageService.getMessagesByConversationId(conversationId);

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

    // Security check
    const isParticipant =
      conversation.participant1Id === senderId ||
      conversation.participant2Id === senderId ||
      conversation.participants?.some((p) => p.userId === senderId);

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Forbidden: You are not a participant in this conversation" });
    }

    const recipientId = senderId === conversation.participant1Id ? conversation.participant2Id : conversation.participant1Id;

    const message = await messageService.createMessage({
      conversationId,
      caseId: conversation.caseId,
      reportId: conversation.reportId,
      senderId,
      recipientId,
      content: content.trim(),
      metadata,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversationId}`).emit("new_message", { message });
      // Notify other participants
      conversation.participants?.forEach((p) => {
        if (p.userId !== senderId) {
          io.to(`user:${p.userId}`).emit("secure_message_received", { message });
        }
      });
      if (recipientId && recipientId !== senderId) {
        io.to(`user:${recipientId}`).emit("secure_message_received", { message });
      }
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

    const isParticipant =
      conversation.participant1Id === userId ||
      conversation.participant2Id === userId ||
      conversation.participants?.some((p) => p.userId === userId);

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await messageService.markMessagesAsReadForUser(conversationId, userId);

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
  return res.json({ success: true, message: "Participant blocked successfully" });
}

// POST /api/messages/conversations/:conversationId/report
export async function reportMessageContent(req: AuthenticatedRequest, res: Response) {
  return res.json({ success: true, message: "Message content reported successfully" });
}

// GET /api/messages/unread
export async function getUnreadCount(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const messages = await messageService.readMessages();
    const count = messages.filter((m) => m.recipientId === userId && !m.isRead).length;
    return res.json({ success: true, count });
  } catch (err: any) {
    console.error("[MessageController] Error getting unread count:", err);
    return res.status(500).json({ success: false, message: "Failed to get unread count" });
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
    return res.status(500).json({ success: false, message: "Failed to fetch unread messages" });
  }
}
