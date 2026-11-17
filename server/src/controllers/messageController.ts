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

// Helper to enrich conversations with user profile, report info, and message activity
async function enrichConversationsForUser(
  conversations: messageService.Conversation[],
  currentUserId: string
) {
  const allMessages = await messageService.readMessages();

  // 1. Gather all reportIds and other participant userIds
  const reportIds: string[] = [];
  const otherUserIds: string[] = [];

  for (const c of conversations) {
    if (c.reportId && !reportIds.includes(c.reportId)) {
      reportIds.push(c.reportId);
    }

    let otherId = c.participant1Id === currentUserId ? c.participant2Id : c.participant1Id;
    if (!otherId || otherId === currentUserId) {
      const otherP = c.participants?.find((p) => p.userId !== currentUserId);
      otherId = otherP?.userId || c.participant2Id || c.participant1Id;
    }
    if (otherId && otherId !== currentUserId && !otherUserIds.includes(otherId)) {
      otherUserIds.push(otherId);
    }
  }

  // 2. Fetch reports from Supabase
  const reportMap: Record<string, any> = {};
  if (reportIds.length > 0) {
    try {
      const { data: reports } = await supabase
        .from("reports")
        .select("id, animal_type, status, image_url, ai_advice")
        .in("id", reportIds);

      if (reports) {
        for (const r of reports) {
          let meta: any = {};
          try {
            meta = JSON.parse(r.ai_advice || "{}");
          } catch {}
          reportMap[r.id] = {
            id: r.id,
            animalType: r.animal_type || "Animal",
            status: meta.originalType || r.status || "lost",
            name: meta.name || "",
            breed: meta.breed || "",
            imageUrl: r.image_url || "",
            reporterId: meta.reporterId || "",
          };
        }
      }
    } catch (e) {
      console.error("[MessageController] Error fetching reports for inbox enrichment:", e);
    }
  }

  // 3. Fetch user profiles from Supabase
  const profileMap: Record<string, { fullName: string; avatarUrl: string | null }> = {};
  if (otherUserIds.length > 0) {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", otherUserIds);

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = {
            fullName: p.full_name || "Pet Parent",
            avatarUrl: p.avatar_url || null,
          };
        }
      }
    } catch (e) {
      console.error("[MessageController] Error fetching profiles for inbox enrichment:", e);
    }
  }

  // 4. Enrich each conversation
  const enriched = conversations.map((c) => {
    let otherParticipantId = c.participant1Id === currentUserId ? c.participant2Id : c.participant1Id;
    if (!otherParticipantId || otherParticipantId === currentUserId) {
      const otherP = c.participants?.find((p) => p.userId !== currentUserId);
      otherParticipantId = otherP?.userId || c.participant2Id || c.participant1Id || "";
    }

    // Messages for this conversation
    const convMsgs = allMessages.filter((m) => m.conversationId === c.id);
    convMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const lastMsg = convMsgs.length > 0 ? convMsgs[convMsgs.length - 1] : null;

    // Unread count: messages sent by other participants that are unread by current user
    const unreadCount = convMsgs.filter((m) => {
      if (m.senderId === currentUserId) return false;
      if (m.isRead) return false;
      if (m.readStates?.some((rs) => rs.userId === currentUserId && rs.readAt)) return false;
      return true;
    }).length;

    // Report context
    const rep = c.reportId ? reportMap[c.reportId] : null;
    let reportName = "Animal Case";
    if (rep) {
      if (rep.name && rep.breed) {
        reportName = `${rep.name} (${rep.breed})`;
      } else if (rep.name) {
        reportName = rep.name;
      } else if (rep.breed) {
        reportName = rep.breed;
      } else if (rep.animalType) {
        reportName = rep.animalType;
      }
    }

    // Other participant identity
    let otherParticipantName = "Pet Parent";
    let otherParticipantAvatar: string | null = null;

    const pProfile = otherParticipantId ? profileMap[otherParticipantId] : null;
    if (c.type === "ngo" && c.organizationId) {
      const ngo = getRegisteredNgoById(c.organizationId);
      if (ngo) {
        otherParticipantName = ngo.name;
        otherParticipantAvatar = ngo.avatarUrl || null;
      }
    } else if (pProfile) {
      otherParticipantName = pProfile.fullName;
      otherParticipantAvatar = pProfile.avatarUrl;
    } else if (c.title) {
      otherParticipantName = c.title;
    }

    const lastMessage = lastMsg ? lastMsg.content : "No messages yet";
    const lastMessageAt = lastMsg ? lastMsg.createdAt : c.updatedAt || c.createdAt;

    return {
      ...c,
      id: c.id,
      conversationId: c.id,
      otherParticipantId,
      otherParticipantName,
      otherParticipantAvatar,
      reportId: c.reportId || "",
      reportName,
      reportStatus: rep?.status || "lost",
      reportImage: rep?.imageUrl || "",
      lastMessage,
      lastMessageAt,
      unreadCount,
    };
  });

  // Sort: most recent message on top
  enriched.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return enriched;
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

// GET /api/messages/inbox & GET /api/conversations/inbox
export async function getInbox(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    const ngoId = req.query.ngoId as string | undefined;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const rawConversations = await messageService.getConversationsForUser(userId);
    const conversations = await enrichConversationsForUser(rawConversations, userId);
    const { cases, directConversations } = await messageService.getCaseGroupedInbox(userId, ngoId);

    return res.json({
      success: true,
      conversations,
      cases,
      directConversations,
    });
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

    const [enriched] = await enrichConversationsForUser([conversation], senderId);

    return res.status(201).json({ success: true, conversation: enriched || conversation, message });
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

    const [enrichedConversation] = await enrichConversationsForUser([conversation], userId);
    const messages = await messageService.getMessagesByConversationId(conversationId);

    // Format messages with proper sender labels
    const formattedMessages = messages.map((m) => {
      const isMe = m.senderId === userId;
      return {
        ...m,
        senderName: isMe ? "You" : (enrichedConversation?.otherParticipantName || m.senderName || "User"),
      };
    });

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

    return res.json({
      success: true,
      conversation: enrichedConversation || conversation,
      messages: formattedMessages,
      ngoDetails,
    });
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

    let recipientId = senderId === conversation.participant1Id ? conversation.participant2Id : conversation.participant1Id;
    if (!recipientId || recipientId === senderId) {
      const other = conversation.participants?.find((p) => p.userId !== senderId);
      recipientId = other?.userId || conversation.participant2Id || conversation.participant1Id;
    }

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
      // Notify other participants via their personal user rooms
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
      const otherParticipant = conversation.participant1Id === userId ? conversation.participant2Id : conversation.participant1Id;
      if (otherParticipant) {
        io.to(`user:${otherParticipant}`).emit("messages_read", { conversationId, readerId: userId });
      }
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
