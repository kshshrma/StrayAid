import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../services/supabase";
import {
  getOrganizations,
  getOrganizationById,
  registerOrganization,
  isUserAuthorizedMemberOfOrg,
} from "../services/organizationService";
import { getHelplines } from "../services/helplineService";
import {
  getOrCreateNGOConversation,
  getNGOConversationById,
  createNGOMessage,
  getNGOMessages,
  updateRescueStatus,
  getUserNGOConversations,
  getNGOInboxConversations,
  markNGOConversationRead,
  canUserAccessNGOConversation,
} from "../services/ngoChatService";

// Helper: Fetch user profile
async function getUserProfile(userId: string): Promise<{ fullName: string; avatarUrl?: string }> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .single();

    if (profile) {
      return {
        fullName: profile.full_name || `User #${userId.substring(0, 5)}`,
        avatarUrl: profile.avatar_url || undefined,
      };
    }
  } catch {}
  return { fullName: `User #${userId.substring(0, 5)}` };
}

// 1. GET /api/connect/organizations
export async function listOrganizations(req: AuthenticatedRequest, res: Response) {
  try {
    const { type, state, city, search, emergencyOnly, availableOnly, lat, lon } = req.query;

    const userLat = lat ? parseFloat(lat as string) : undefined;
    const userLon = lon ? parseFloat(lon as string) : undefined;

    const orgs = await getOrganizations({
      type: type as string,
      state: state as string,
      city: city as string,
      search: search as string,
      emergencyOnly: emergencyOnly === "true",
      availableOnly: availableOnly === "true",
      userLat,
      userLon,
    });

    return res.json({
      success: true,
      organizations: orgs,
      total: orgs.length,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error listing organizations:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 2. GET /api/connect/organizations/:id
export async function getOrganizationProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const id = String(req.params.id || "");
    const org = await getOrganizationById(id);

    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    return res.json({
      success: true,
      organization: org,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error getting organization profile:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 3. POST /api/connect/organizations/register
export async function submitOrganizationRegistration(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { name, organizationType, city, state, phone, address, description } = req.body;

    if (!name || !organizationType || !city || !state || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, organizationType, city, state, and phone are required",
      });
    }

    const userProfile = await getUserProfile(req.userId);
    const newOrg = await registerOrganization(req.userId, userProfile.fullName, req.body);

    return res.status(201).json({
      success: true,
      message: "Organization registration submitted successfully. It will be reviewed by administrators before verification.",
      organization: newOrg,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error submitting organization registration:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 4. GET /api/connect/helplines
export async function listHelplines(req: AuthenticatedRequest, res: Response) {
  try {
    const { category, state, city, search, emergencyOnly } = req.query;

    const data = await getHelplines({
      category: category as string,
      state: state as string,
      city: city as string,
      search: search as string,
      emergencyOnly: emergencyOnly === "true",
    });

    return res.json({
      success: true,
      helplines: data.helplines,
      state1962Status: data.state1962Status,
      total: data.helplines.length,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error listing helplines:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 5. POST /api/connect/chat/start
export async function startOrGetNGOConversation(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { organizationId, requestType, reportId, rescueDetails, initialMessage, reportContext } = req.body;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required" });
    }

    const userProfile = await getUserProfile(req.userId);
    const conv = await getOrCreateNGOConversation(
      req.userId,
      userProfile.fullName,
      userProfile.avatarUrl,
      organizationId,
      requestType || "general",
      reportId,
      rescueDetails
    );

    let createdMessage = null;

    // If initial message or report card provided
    if (initialMessage || reportContext) {
      const msgType = reportContext ? "report_card" : rescueDetails ? "rescue_card" : "text";
      const content = initialMessage || (reportContext ? `Shared ${reportContext.status.toUpperCase()} animal report: ${reportContext.name || reportContext.animalType}` : "Rescue request submitted.");

      createdMessage = await createNGOMessage(
        conv.id,
        req.userId,
        "user",
        userProfile.fullName,
        userProfile.avatarUrl,
        content,
        msgType,
        reportContext
      );

      // Emit real-time notification to NGO room and conversation room
      const io = req.app.get("io");
      if (io) {
        io.to(`org:${organizationId}`).emit("ngo_new_request", {
          conversation: conv,
          message: createdMessage,
        });
        io.to(`ngo_conv:${conv.id}`).emit("ngo_message_received", createdMessage);
      }
    }

    return res.json({
      success: true,
      conversation: conv,
      message: createdMessage,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error starting NGO conversation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 6. GET /api/connect/chat/my-conversations
export async function getMyNGOConversations(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const conversations = await getUserNGOConversations(req.userId);
    return res.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error fetching user NGO conversations:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 7. GET /api/connect/chat/ngo-inbox/:organizationId
export async function getNGOInbox(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const organizationId = String(req.params.organizationId || "");
    const isMember = await isUserAuthorizedMemberOfOrg(req.userId, organizationId);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not an authorized member of this organization",
      });
    }

    const conversations = await getNGOInboxConversations(organizationId);
    return res.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error fetching NGO inbox:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 8. GET /api/connect/chat/conversations/:id
export async function getNGOConversationDetails(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const id = String(req.params.id || "");
    const { canAccess, isOrgMember, conversation } = await canUserAccessNGOConversation(id, req.userId);

    if (!canAccess || !conversation) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this conversation",
      });
    }

    // Mark as read
    await markNGOConversationRead(id, req.userId, isOrgMember);

    const messages = await getNGOMessages(id);

    return res.json({
      success: true,
      conversation,
      messages,
      isOrgMember,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error fetching conversation details:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 9. POST /api/connect/chat/conversations/:id/messages
export async function sendNGOMessage(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const id = String(req.params.id || "");
    const { content, messageType, reportContext } = req.body;

    if (!content && !reportContext) {
      return res.status(400).json({ success: false, message: "Message content or report context is required" });
    }

    const { canAccess, isOrgMember, conversation } = await canUserAccessNGOConversation(id, req.userId);

    if (!canAccess || !conversation) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to post in this conversation",
      });
    }

    let senderType: "user" | "ngo" = isOrgMember ? "ngo" : "user";
    let senderName = "";
    let senderAvatar: string | undefined = undefined;

    if (isOrgMember) {
      senderName = conversation.organizationName;
      senderAvatar = conversation.organizationLogo;
    } else {
      const userProfile = await getUserProfile(req.userId);
      senderName = userProfile.fullName;
      senderAvatar = userProfile.avatarUrl;
    }

    const newMessage = await createNGOMessage(
      id,
      req.userId,
      senderType,
      senderName,
      senderAvatar,
      content || `Shared report`,
      messageType || (reportContext ? "report_card" : "text"),
      reportContext
    );

    // Emit real-time Socket.IO event strictly to the conversation room and target user/org room
    const io = req.app.get("io");
    if (io) {
      io.to(`ngo_conv:${id}`).emit("ngo_message_received", newMessage);

      if (isOrgMember) {
        // Notify citizen
        io.to(`user:${conversation.userId}`).emit("ngo_reply_received", {
          conversationId: id,
          organizationName: conversation.organizationName,
          message: newMessage,
        });
      } else {
        // Notify NGO staff
        io.to(`org:${conversation.organizationId}`).emit("ngo_user_message_received", {
          conversationId: id,
          userName: senderName,
          message: newMessage,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error sending NGO message:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 10. PATCH /api/connect/chat/conversations/:id/status
export async function updateNGOConversationRescueStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const id = String(req.params.id || "");
    const { status } = req.body;

    const validStatuses = ["pending", "reviewing", "accepted", "declined", "in_progress", "resolved"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const { canAccess, isOrgMember, conversation } = await canUserAccessNGOConversation(id, req.userId);

    if (!canAccess || !isOrgMember || !conversation) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only authorized members of the organization can update rescue status",
      });
    }

    const userProfile = await getUserProfile(req.userId);
    const result = await updateRescueStatus(
      id,
      status,
      req.userId,
      userProfile.fullName
    );

    // Emit real-time status update to conversation room and user room
    const io = req.app.get("io");
    if (io) {
      io.to(`ngo_conv:${id}`).emit("ngo_request_status_updated", {
        conversationId: id,
        status,
        updatedBy: userProfile.fullName,
        message: result.message,
      });
      io.to(`ngo_conv:${id}`).emit("ngo_message_received", result.message);
      io.to(`user:${conversation.userId}`).emit("ngo_status_notification", {
        conversationId: id,
        organizationName: conversation.organizationName,
        status,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      conversation: result.conversation,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[ConnectController] Error updating rescue status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
