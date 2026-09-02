import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getOrganizationById, isUserAuthorizedMemberOfOrg } from "./organizationService";

export interface RescueDetails {
  emergencyType?: string | undefined;
  animalInfo?: string | undefined;
  location?: string | undefined;
  urgency?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  description?: string | undefined;
}

export interface ReportSummaryContext {
  reportId: string;
  animalType: string;
  breed?: string | undefined;
  name?: string | undefined;
  color?: string | undefined;
  status: "lost" | "found" | "pending" | "emergency";
  location: string;
  image?: string | undefined;
  lastSeen?: string | undefined;
  urgency?: string | undefined;
}

export interface NGOConversation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationLogo?: string | undefined;
  userId: string;
  userName?: string | undefined;
  userAvatar?: string | undefined;
  reportId?: string | undefined;
  requestType: "general" | "lost_report" | "found_report" | "emergency_rescue" | "veterinary";
  rescueStatus?: "pending" | "reviewing" | "accepted" | "declined" | "in_progress" | "resolved" | undefined;
  rescueDetails?: RescueDetails | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface NGOMessage {
  id: string;
  conversationId: string;
  organizationId: string;
  senderId: string;
  senderType: "user" | "ngo";
  senderName: string;
  senderAvatar?: string | undefined;
  content: string;
  messageType: "text" | "report_card" | "rescue_card" | "status_update";
  reportContext?: ReportSummaryContext | undefined;
  createdAt: string;
  isRead: boolean;
}

const DATA_DIR = path.resolve("src/data");
const NGO_CONVERSATIONS_FILE = path.join(DATA_DIR, "ngo_conversations.json");
const NGO_MESSAGES_FILE = path.join(DATA_DIR, "ngo_messages.json");

async function ensureFilesExist() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(NGO_CONVERSATIONS_FILE);
    } catch {
      await fs.writeFile(NGO_CONVERSATIONS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    try {
      await fs.access(NGO_MESSAGES_FILE);
    } catch {
      await fs.writeFile(NGO_MESSAGES_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[NGOChatService] Failed to ensure files exist:", err);
  }
}

export async function readNGOConversations(): Promise<NGOConversation[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(NGO_CONVERSATIONS_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch (e) {
    return [];
  }
}

export async function writeNGOConversations(conversations: NGOConversation[]): Promise<void> {
  await ensureFilesExist();
  await fs.writeFile(NGO_CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2), "utf-8");
}

export async function readNGOMessages(): Promise<NGOMessage[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(NGO_MESSAGES_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch (e) {
    return [];
  }
}

export async function writeNGOMessages(messages: NGOMessage[]): Promise<void> {
  await ensureFilesExist();
  await fs.writeFile(NGO_MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf-8");
}

export async function getNGOConversationById(id: string): Promise<NGOConversation | null> {
  const convs = await readNGOConversations();
  return convs.find((c) => c.id === id) || null;
}

export async function getOrCreateNGOConversation(
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  organizationId: string,
  requestType: "general" | "lost_report" | "found_report" | "emergency_rescue" | "veterinary" = "general",
  reportId?: string | undefined,
  rescueDetails?: RescueDetails | undefined
): Promise<NGOConversation> {
  const org = await getOrganizationById(organizationId);
  if (!org) {
    throw new Error("Organization not found");
  }

  const convs = await readNGOConversations();

  // Find existing conversation between this user and NGO
  // If reportId is provided, check if a conversation for that specific report exists
  let conv = convs.find((c) => {
    if (c.userId !== userId || c.organizationId !== organizationId) return false;
    if (reportId && c.reportId !== reportId) return false;
    if (!reportId && c.reportId) return false;
    return true;
  });

  if (!conv) {
    conv = {
      id: `ngo-conv-${crypto.randomUUID()}`,
      organizationId: org.id,
      organizationName: org.name,
      organizationLogo: org.logo,
      userId,
      userName: userName || `User #${userId.substring(0, 5)}`,
      userAvatar,
      reportId,
      requestType,
      rescueStatus: requestType === "emergency_rescue" || requestType === "lost_report" || requestType === "found_report" ? "pending" : undefined,
      rescueDetails,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    convs.push(conv);
    await writeNGOConversations(convs);
  }

  return conv;
}

export async function createNGOMessage(
  conversationId: string,
  senderId: string,
  senderType: "user" | "ngo",
  senderName: string,
  senderAvatar: string | undefined,
  content: string,
  messageType: "text" | "report_card" | "rescue_card" | "status_update" = "text",
  reportContext?: ReportSummaryContext | undefined
): Promise<NGOMessage> {
  const conv = await getNGOConversationById(conversationId);
  if (!conv) {
    throw new Error("Conversation not found");
  }

  const messages = await readNGOMessages();
  const newMsg: NGOMessage = {
    id: `ngo-msg-${crypto.randomUUID()}`,
    conversationId,
    organizationId: conv.organizationId,
    senderId,
    senderType,
    senderName,
    senderAvatar,
    content,
    messageType,
    reportContext,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  messages.push(newMsg);
  await writeNGOMessages(messages);

  // Update conversation timestamp
  const convs = await readNGOConversations();
  const c = convs.find((item) => item.id === conversationId);
  if (c) {
    c.updatedAt = new Date().toISOString();
    await writeNGOConversations(convs);
  }

  return newMsg;
}

export async function getNGOMessages(conversationId: string): Promise<NGOMessage[]> {
  const messages = await readNGOMessages();
  return messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateRescueStatus(
  conversationId: string,
  status: "pending" | "reviewing" | "accepted" | "declined" | "in_progress" | "resolved",
  updatedByUserId: string,
  updatedByName: string
): Promise<{ conversation: NGOConversation; message: NGOMessage }> {
  const convs = await readNGOConversations();
  const conv = convs.find((c) => c.id === conversationId);
  if (!conv) {
    throw new Error("Conversation not found");
  }

  conv.rescueStatus = status;
  conv.updatedAt = new Date().toISOString();
  await writeNGOConversations(convs);

  // Auto-generate status update message in the conversation
  let statusText = `Rescue status updated to "${status.replace("_", " ").toUpperCase()}" by ${updatedByName}`;
  if (status === "accepted") {
    statusText = `🟢 ${conv.organizationName} accepted this rescue request. Team is mobilizing.`;
  } else if (status === "reviewing") {
    statusText = `🔍 ${conv.organizationName} is reviewing this rescue report.`;
  } else if (status === "in_progress") {
    statusText = `🚑 Rescue in progress by ${conv.organizationName}.`;
  } else if (status === "resolved") {
    statusText = `✅ Animal rescue successfully resolved by ${conv.organizationName}.`;
  } else if (status === "declined") {
    statusText = `❌ Request could not be accommodated by ${conv.organizationName}. Please try nearby emergency helplines.`;
  }

  const statusMsg = await createNGOMessage(
    conversationId,
    updatedByUserId,
    "ngo",
    updatedByName,
    conv.organizationLogo,
    statusText,
    "status_update"
  );

  return { conversation: conv, message: statusMsg };
}

export async function getUserNGOConversations(userId: string): Promise<any[]> {
  const convs = await readNGOConversations();
  const userConvs = convs.filter((c) => c.userId === userId);
  const messages = await readNGOMessages();

  const results = userConvs.map((c) => {
    const convMsgs = messages.filter((m) => m.conversationId === c.id);
    const sorted = [...convMsgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const lastMsg = sorted[sorted.length - 1];
    const unreadCount = convMsgs.filter(
      (m) => m.senderType === "ngo" && !m.isRead
    ).length;

    return {
      ...c,
      lastMessage: lastMsg ? lastMsg.content : "Conversation initiated",
      lastMessageAt: lastMsg ? lastMsg.createdAt : c.updatedAt,
      unreadCount,
    };
  });

  return results.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

export async function getNGOInboxConversations(organizationId: string): Promise<any[]> {
  const convs = await readNGOConversations();
  const orgConvs = convs.filter((c) => c.organizationId === organizationId);
  const messages = await readNGOMessages();

  const results = orgConvs.map((c) => {
    const convMsgs = messages.filter((m) => m.conversationId === c.id);
    const sorted = [...convMsgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const lastMsg = sorted[sorted.length - 1];
    const unreadCount = convMsgs.filter(
      (m) => m.senderType === "user" && !m.isRead
    ).length;

    return {
      ...c,
      lastMessage: lastMsg ? lastMsg.content : "New rescue inquiry",
      lastMessageAt: lastMsg ? lastMsg.createdAt : c.updatedAt,
      unreadCount,
    };
  });

  return results.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

export async function markNGOConversationRead(
  conversationId: string,
  currentUserId: string,
  isOrgMember: boolean
): Promise<void> {
  const messages = await readNGOMessages();
  let updated = false;

  const updatedMessages = messages.map((m) => {
    if (m.conversationId === conversationId) {
      if (isOrgMember && m.senderType === "user" && !m.isRead) {
        updated = true;
        return { ...m, isRead: true };
      }
      if (!isOrgMember && m.senderType === "ngo" && !m.isRead) {
        updated = true;
        return { ...m, isRead: true };
      }
    }
    return m;
  });

  if (updated) {
    await writeNGOMessages(updatedMessages);
  }
}

export async function canUserAccessNGOConversation(
  conversationId: string,
  userId: string
): Promise<{ canAccess: boolean; isOrgMember: boolean; conversation: NGOConversation | null }> {
  const conv = await getNGOConversationById(conversationId);
  if (!conv) {
    return { canAccess: false, isOrgMember: false, conversation: null };
  }

  // Check 1: User is the citizen who started the conversation
  if (conv.userId === userId) {
    return { canAccess: true, isOrgMember: false, conversation: conv };
  }

  // Check 2: User is an authorized member of the organization
  const isMember = await isUserAuthorizedMemberOfOrg(userId, conv.organizationId);
  if (isMember) {
    return { canAccess: true, isOrgMember: true, conversation: conv };
  }

  return { canAccess: false, isOrgMember: false, conversation: conv };
}
