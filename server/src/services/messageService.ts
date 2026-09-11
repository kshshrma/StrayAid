import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { supabase } from "./supabase";
import { getRegisteredNgoById, REGISTERED_NGOS, RegisteredNGO } from "./ngoService";

export interface ConversationParticipant {
  userId: string;
  role: "REPORTER" | "NGO" | "VOLUNTEER" | "VET" | "FOSTER" | "CITIZEN";
  name?: string | undefined;
  joinedAt: string;
  leftAt?: string | undefined;
}

export interface Conversation {
  id: string;
  caseId?: string | undefined;
  type?: "REPORTER_NGO" | "NGO_VOLUNTEER" | "NGO_VET" | "CASE_GROUP" | "report" | "ngo" | undefined;
  title?: string | undefined;
  organizationId?: string | undefined;
  reportId?: string | undefined;
  participant1Id?: string | undefined; // Citizen / Initiator
  participant2Id?: string | undefined; // NGO / Report Owner
  participants: ConversationParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageMetadata {
  type?: "text" | "report_attachment" | "case_update" | undefined;
  reportId?: string | undefined;
  caseId?: string | undefined;
  animalType?: string | undefined;
  breed?: string | undefined;
  status?: "lost" | "found" | undefined;
  location?: string | undefined;
  urgency?: string | undefined;
  imageUrl?: string | undefined;
}

export interface MessageReadState {
  messageId: string;
  userId: string;
  readAt?: string | undefined;
  deliveredAt?: string | undefined;
}

export interface Message {
  id: string;
  conversationId: string;
  caseId?: string | undefined;
  reportId?: string | undefined;
  senderId: string;
  senderName?: string | undefined;
  recipientId?: string | undefined; // Kept for 1-on-1 compatibility
  content: string;
  createdAt: string;
  isRead: boolean;
  readStates?: MessageReadState[] | undefined;
  metadata?: MessageMetadata | undefined;
}

const DATA_DIR = path.resolve("src/data");
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

async function getReportOwnerId(reportId: string): Promise<string> {
  try {
    const { data: report } = await supabase
      .from("reports")
      .select("ai_advice")
      .eq("id", reportId)
      .single();

    if (report) {
      const metadata = JSON.parse(report.ai_advice || "{}");
      return metadata.reporterId || "6c4c4175-c2c4-470b-a5d5-c86639f3e949";
    }
  } catch {}
  return "6c4c4175-c2c4-470b-a5d5-c86639f3e949";
}

async function ensureFilesExist() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    let conversationsExist = true;
    try {
      await fs.access(CONVERSATIONS_FILE);
    } catch {
      conversationsExist = false;
      await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify([]), "utf-8");
    }

    let messagesExist = true;
    try {
      await fs.access(MESSAGES_FILE);
    } catch {
      messagesExist = false;
      await fs.writeFile(MESSAGES_FILE, JSON.stringify([]), "utf-8");
    }

    if (messagesExist && conversationsExist) {
      const convContent = await fs.readFile(CONVERSATIONS_FILE, "utf-8");
      const conversations: any[] = JSON.parse(convContent || "[]");
      let convsUpdated = false;

      for (const c of conversations) {
        if (!c.participants || !Array.isArray(c.participants)) {
          c.participants = [];
          if (c.participant1Id) {
            c.participants.push({ userId: c.participant1Id, role: "CITIZEN", joinedAt: c.createdAt || new Date().toISOString() });
          }
          if (c.participant2Id) {
            c.participants.push({ userId: c.participant2Id, role: "NGO", joinedAt: c.createdAt || new Date().toISOString() });
          }
          convsUpdated = true;
        }
      }

      if (convsUpdated) {
        await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2), "utf-8");
      }
    }
  } catch (err) {
    console.error("[MessageService] Error initializing files:", err);
  }
}

export async function readConversations(): Promise<Conversation[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(CONVERSATIONS_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch {
    return [];
  }
}

export async function writeConversations(conversations: Conversation[]): Promise<void> {
  await ensureFilesExist();
  await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2), "utf-8");
}

export async function readMessages(): Promise<Message[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(MESSAGES_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch {
    return [];
  }
}

export async function writeMessages(messages: Message[]): Promise<void> {
  await ensureFilesExist();
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf-8");
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const conversations = await readConversations();
  return conversations.find((c) => c.id === id) || null;
}

export async function getOrCreateCaseConversation(
  caseId: string,
  type: "REPORTER_NGO" | "NGO_VOLUNTEER" | "NGO_VET" | "CASE_GROUP" = "CASE_GROUP",
  initialParticipants: { userId: string; role: ConversationParticipant["role"]; name?: string | undefined }[] = [],
  title?: string
): Promise<Conversation> {
  const conversations = await readConversations();
  let conv = conversations.find((c) => c.caseId === caseId && c.type === type);

  if (!conv) {
    const now = new Date().toISOString();
    conv = {
      id: "conv_" + crypto.randomUUID(),
      caseId,
      type,
      title: title || `Case #${caseId} Coordination`,
      participants: initialParticipants.map((p) => ({
        userId: p.userId,
        role: p.role,
        name: p.name,
        joinedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
    conversations.unshift(conv);
    await writeConversations(conversations);
  } else {
    // Add missing participants
    let updated = false;
    for (const p of initialParticipants) {
      if (!conv.participants.some((cp) => cp.userId === p.userId)) {
        conv.participants.push({
          userId: p.userId,
          role: p.role,
          name: p.name,
          joinedAt: new Date().toISOString(),
        });
        updated = true;
      }
    }
    if (updated) {
      conv.updatedAt = new Date().toISOString();
      await writeConversations(conversations);
    }
  }

  return conv;
}

export async function getOrCreateNgoConversation(
  citizenUserId: string,
  organizationId: string
): Promise<Conversation> {
  const conversations = await readConversations();
  const ngo = getRegisteredNgoById(organizationId);
  const repUserId = ngo ? ngo.representativeUserId : "6c4c4175-c2c4-470b-a5d5-c86639f3e949";

  let conv = conversations.find(
    (c) =>
      c.type === "ngo" &&
      c.organizationId === organizationId &&
      ((c.participant1Id === citizenUserId && c.participant2Id === repUserId) ||
        (c.participant1Id === repUserId && c.participant2Id === citizenUserId) ||
        c.participants.some((p) => p.userId === citizenUserId))
  );

  if (!conv) {
    const now = new Date().toISOString();
    conv = {
      id: crypto.randomUUID(),
      type: "ngo",
      organizationId,
      participant1Id: citizenUserId,
      participant2Id: repUserId,
      participants: [
        { userId: citizenUserId, role: "CITIZEN", joinedAt: now },
        { userId: repUserId, role: "NGO", joinedAt: now },
      ],
      createdAt: now,
      updatedAt: now,
    };
    conversations.push(conv);
    await writeConversations(conversations);
  }

  return conv;
}

export async function getOrCreateReportConversation(
  citizenUserId: string,
  reportId: string
): Promise<Conversation> {
  const conversations = await readConversations();
  const reportOwnerId = await getReportOwnerId(reportId);

  let conv = conversations.find(
    (c) =>
      c.type === "report" &&
      c.reportId === reportId &&
      ((c.participant1Id === citizenUserId && c.participant2Id === reportOwnerId) ||
        (c.participant1Id === reportOwnerId && c.participant2Id === citizenUserId) ||
        c.participants.some((p) => p.userId === citizenUserId))
  );

  if (!conv) {
    const now = new Date().toISOString();
    conv = {
      id: crypto.randomUUID(),
      type: "report",
      reportId,
      participant1Id: citizenUserId,
      participant2Id: reportOwnerId,
      participants: [
        { userId: citizenUserId, role: "CITIZEN", joinedAt: now },
        { userId: reportOwnerId, role: "CITIZEN", joinedAt: now },
      ],
      createdAt: now,
      updatedAt: now,
    };
    conversations.push(conv);
    await writeConversations(conversations);
  }

  return conv;
}

export async function getConversationsForUser(userId: string): Promise<Conversation[]> {
  const conversations = await readConversations();
  return conversations.filter(
    (c) =>
      c.participant1Id === userId ||
      c.participant2Id === userId ||
      c.participants.some((p) => p.userId === userId)
  );
}

export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  const messages = await readMessages();
  return messages.filter((m) => m.conversationId === conversationId);
}

export async function createMessage(data: {
  conversationId: string;
  caseId?: string | undefined;
  reportId?: string | undefined;
  senderId: string;
  senderName?: string | undefined;
  recipientId?: string | undefined;
  content: string;
  metadata?: MessageMetadata | undefined;
}): Promise<Message> {
  const messages = await readMessages();
  const conversations = await readConversations();

  const conversationIndex = conversations.findIndex((c) => c.id === data.conversationId);
  if (conversationIndex !== -1) {
    const conv = conversations[conversationIndex];
    if (conv) {
      conv.updatedAt = new Date().toISOString();
      await writeConversations(conversations);
    }
  }

  const newMessage: Message = {
    id: crypto.randomUUID(),
    conversationId: data.conversationId,
    caseId: data.caseId,
    reportId: data.reportId,
    senderId: data.senderId,
    senderName: data.senderName,
    recipientId: data.recipientId,
    content: data.content,
    createdAt: new Date().toISOString(),
    isRead: false,
    readStates: [
      {
        messageId: "",
        userId: data.senderId,
        readAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
      },
    ],
    metadata: data.metadata,
  };

  messages.push(newMessage);
  await writeMessages(messages);
  return newMessage;
}

export async function markMessagesAsReadForUser(
  conversationId: string,
  userId: string
): Promise<void> {
  const messages = await readMessages();
  const now = new Date().toISOString();
  let updated = false;

  for (const m of messages) {
    if (m.conversationId === conversationId && m.senderId !== userId) {
      m.isRead = true;
      if (!m.readStates) {
        m.readStates = [];
      }
      const existing = m.readStates.find((r) => r.userId === userId);
      if (existing) {
        if (!existing.readAt) existing.readAt = now;
      } else {
        m.readStates.push({
          messageId: m.id,
          userId,
          readAt: now,
          deliveredAt: now,
        });
      }
      updated = true;
    }
  }

  if (updated) {
    await writeMessages(messages);
  }
}
