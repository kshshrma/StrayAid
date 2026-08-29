import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { supabase } from "./supabase";

export interface Conversation {
  id: string;
  reportId: string;
  participant1Id: string; // Report Owner
  participant2Id: string; // Enquirer
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  reportId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
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

    if (messagesExist) {
      const messagesContent = await fs.readFile(MESSAGES_FILE, "utf-8");
      const messages: any[] = JSON.parse(messagesContent || "[]");

      const conversationsContent = await fs.readFile(CONVERSATIONS_FILE, "utf-8");
      const conversations: Conversation[] = JSON.parse(conversationsContent || "[]");

      const needsMigration = messages.some((m) => !m.conversationId);
      if (needsMigration) {
        console.log("🛠️ Migrating old messages to conversation-based database schema...");
        for (const msg of messages) {
          if (!msg.conversationId) {
            const ownerId = await getReportOwnerId(msg.reportId);
            const enquirerId = msg.senderId === ownerId ? msg.recipientId : msg.senderId;

            let conv = conversations.find(
              (c) =>
                c.reportId === msg.reportId &&
                ((c.participant1Id === ownerId && c.participant2Id === enquirerId) ||
                  (c.participant1Id === enquirerId && c.participant2Id === ownerId))
            );

            if (!conv) {
              conv = {
                id: crypto.randomUUID(),
                reportId: msg.reportId,
                participant1Id: ownerId,
                participant2Id: enquirerId,
                createdAt: msg.createdAt || new Date().toISOString(),
                updatedAt: msg.createdAt || new Date().toISOString(),
              };
              conversations.push(conv);
            }
            msg.conversationId = conv.id;
          }
        }

        await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2), "utf-8");
        await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf-8");
        console.log("✅ Messages migration completed successfully!");
      }
    }
  } catch (err) {
    console.error("[MessageService] Error during files initialization/migration:", err);
  }
}

export async function readConversations(): Promise<Conversation[]> {
  await ensureFilesExist();
  try {
    const content = await fs.readFile(CONVERSATIONS_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch (e) {
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
  } catch (e) {
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

export async function getOrCreateConversation(
  reportId: string,
  participant1Id: string,
  participant2Id: string
): Promise<Conversation> {
  const conversations = await readConversations();
  
  let conv = conversations.find(
    (c) =>
      c.reportId === reportId &&
      ((c.participant1Id === participant1Id && c.participant2Id === participant2Id) ||
        (c.participant1Id === participant2Id && c.participant2Id === participant1Id))
  );

  if (!conv) {
    conv = {
      id: crypto.randomUUID(),
      reportId,
      participant1Id,
      participant2Id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    conversations.push(conv);
    await writeConversations(conversations);
  }

  return conv;
}

export async function createMessage(
  conversationId: string,
  reportId: string,
  senderId: string,
  recipientId: string,
  content: string
): Promise<Message> {
  const messages = await readMessages();
  const newMessage: Message = {
    id: crypto.randomUUID(),
    conversationId,
    reportId,
    senderId,
    recipientId,
    content,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
  messages.push(newMessage);
  await writeMessages(messages);

  // Update conversation updatedAt timestamp
  const conversations = await readConversations();
  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.updatedAt = new Date().toISOString();
    await writeConversations(conversations);
  }

  return newMessage;
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const messages = await readMessages();
  return messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getUnreadMessagesCount(recipientId: string): Promise<number> {
  const messages = await readMessages();
  return messages.filter((m) => m.recipientId === recipientId && !m.isRead).length;
}

export async function markConversationAsRead(
  conversationId: string,
  recipientId: string
): Promise<void> {
  const messages = await readMessages();
  let updated = false;
  const updatedMessages = messages.map((m) => {
    if (m.conversationId === conversationId && m.recipientId === recipientId && !m.isRead) {
      updated = true;
      return { ...m, isRead: true };
    }
    return m;
  });

  if (updated) {
    await writeMessages(updatedMessages);
  }
}

export async function getConversationsForUser(userId: string): Promise<any[]> {
  const conversations = await readConversations();
  const userConvs = conversations.filter(
    (c) => c.participant1Id === userId || c.participant2Id === userId
  );

  if (userConvs.length === 0) return [];

  // Batch query profile information for other participants
  const otherUserIds = Array.from(
    new Set(
      userConvs.map((c) => (c.participant1Id === userId ? c.participant2Id : c.participant1Id))
    )
  );
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", otherUserIds);

  const profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
  if (profiles) {
    profiles.forEach((p) => {
      profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
    });
  }

  // Batch query report context information
  const reportIds = Array.from(new Set(userConvs.map((c) => c.reportId)));
  const { data: reports } = await supabase
    .from("reports")
    .select("id, status, animal_type, ai_advice")
    .in("id", reportIds);

  const reportMap = new Map<string, { name: string; status: string }>();
  if (reports) {
    reports.forEach((r) => {
      let breed = r.animal_type || "Animal";
      let name = "";
      try {
        const meta = JSON.parse(r.ai_advice || "{}");
        breed = meta.breed || breed;
        name = meta.name || "";
      } catch {}
      
      const petName = name ? `${name} (${breed})` : breed;
      reportMap.set(r.id, { name: petName, status: r.status });
    });
  }

  const messages = await readMessages();

  const list = userConvs.map((c) => {
    const otherParticipantId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
    const profile = profileMap.get(otherParticipantId) || {
      full_name: `User #${otherParticipantId.substring(0, 5)}`,
      avatar_url: null,
    };
    const reportContext = reportMap.get(c.reportId) || {
      name: "Unknown Animal",
      status: "lost",
    };

    // Find messages in this conversation
    const convMsgs = messages.filter((m) => m.conversationId === c.id);
    const sortedMsgs = [...convMsgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const lastMsg = sortedMsgs[sortedMsgs.length - 1];
    const unreadCount = convMsgs.filter((m) => m.recipientId === userId && !m.isRead).length;

    return {
      conversationId: c.id,
      reportId: c.reportId,
      otherParticipantId,
      otherParticipantName: profile.full_name,
      otherParticipantAvatar: profile.avatar_url,
      reportName: reportContext.name,
      reportStatus: reportContext.status,
      lastMessage: lastMsg ? lastMsg.content : "No messages yet.",
      lastMessageAt: lastMsg ? lastMsg.createdAt : c.updatedAt,
      unreadCount,
    };
  });

  // Sort by lastMessageAt descending
  return list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}
