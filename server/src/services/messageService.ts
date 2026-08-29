import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface Message {
  id: string;
  reportId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

const DATA_DIR = path.resolve("src/data");
const FILE_PATH = path.join(DATA_DIR, "messages.json");

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(FILE_PATH);
    } catch {
      await fs.writeFile(FILE_PATH, JSON.stringify([]), "utf-8");
    }
  } catch (err) {
    console.error("[MessageService] Failed to ensure directory/file exists:", err);
  }
}

export async function readMessages(): Promise<Message[]> {
  await ensureFileExists();
  try {
    const content = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(content || "[]");
  } catch (e) {
    return [];
  }
}

export async function writeMessages(messages: Message[]): Promise<void> {
  await ensureFileExists();
  await fs.writeFile(FILE_PATH, JSON.stringify(messages, null, 2), "utf-8");
}

export async function createMessage(
  reportId: string,
  senderId: string,
  recipientId: string,
  content: string
): Promise<Message> {
  const messages = await readMessages();
  const newMessage: Message = {
    id: crypto.randomUUID(),
    reportId,
    senderId,
    recipientId,
    content,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
  messages.push(newMessage);
  await writeMessages(messages);
  return newMessage;
}

export async function getConversationMessages(
  reportId: string,
  userA: string,
  userB: string
): Promise<Message[]> {
  const messages = await readMessages();
  return messages.filter(
    (m) =>
      m.reportId === reportId &&
      ((m.senderId === userA && m.recipientId === userB) ||
        (m.senderId === userB && m.recipientId === userA))
  );
}

export async function getUnreadMessagesCount(recipientId: string): Promise<number> {
  const messages = await readMessages();
  return messages.filter((m) => m.recipientId === recipientId && !m.isRead).length;
}

export async function markConversationAsRead(
  reportId: string,
  recipientId: string,
  senderId: string
): Promise<void> {
  const messages = await readMessages();
  let updated = false;
  const updatedMessages = messages.map((m) => {
    if (
      m.reportId === reportId &&
      m.recipientId === recipientId &&
      m.senderId === senderId &&
      !m.isRead
    ) {
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
  const messages = await readMessages();
  // Filter messages where user is sender or recipient
  const userMessages = messages.filter((m) => m.senderId === userId || m.recipientId === userId);

  // Group by reportId + the other participant
  const groups: { [key: string]: Message[] } = {};
  userMessages.forEach((m) => {
    const otherUser = m.senderId === userId ? m.recipientId : m.senderId;
    const key = `${m.reportId}:${otherUser}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(m);
  });

  const list = Object.keys(groups).map((key) => {
    const [reportId, otherUser] = key.split(":");
    const rawMsgs = groups[key] || [];
    const msgs = [...rawMsgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const lastMsg = msgs[msgs.length - 1];
    const unreadCount = msgs.filter((m) => m.recipientId === userId && !m.isRead).length;

    return {
      reportId,
      otherParticipantId: otherUser,
      lastMessage: lastMsg ? lastMsg.content : "",
      lastMessageAt: lastMsg ? lastMsg.createdAt : new Date().toISOString(),
      unreadCount,
    };
  });

  return list;
}
