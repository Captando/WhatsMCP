import type { WASocket, WAMessage, MessageUpsertType } from '@whiskeysockets/baileys';
import { chatRepository } from '../db/repositories/chatRepository.js';
import type { ClaudeAgent } from '../agent/claudeAgent.js';

// In-memory deduplication (max 1000 IDs)
const processedIds = new Set<string>();

// Per-JID agent queue to serialize concurrent messages
const agentQueues = new Map<string, Promise<void>>();

export function handleMessagesUpsert(
  { messages, type }: { messages: WAMessage[]; type: MessageUpsertType },
  sock: WASocket,
  agent: ClaudeAgent
): void {
  if (type !== 'notify') return;

  for (const msg of messages) {
    processMessageSafe(msg, sock, agent);
  }
}

function processMessageSafe(msg: WAMessage, sock: WASocket, agent: ClaudeAgent): void {
  const jid = msg.key.remoteJid;
  if (!jid) return;

  const prev = agentQueues.get(jid) ?? Promise.resolve();
  const next = prev
    .then(() => processMessage(msg, sock, agent))
    .catch((err: unknown) => {
      console.error(`[Handler] Error processing message for ${jid}:`, err);
    });

  agentQueues.set(jid, next);
  next.then(() => {
    if (agentQueues.get(jid) === next) agentQueues.delete(jid);
  });
}

async function processMessage(msg: WAMessage, sock: WASocket, agent: ClaudeAgent): Promise<void> {
  if (msg.key.fromMe) return;

  const msgId = msg.key.id;
  if (msgId) {
    if (processedIds.has(msgId)) return;
    processedIds.add(msgId);
    if (processedIds.size > 1000) {
      const [first] = processedIds;
      processedIds.delete(first);
    }
  }

  const text = extractText(msg);
  if (!text?.trim()) return;

  const jid = msg.key.remoteJid!;
  const isGroup = jid.endsWith('@g.us');
  const senderJid = isGroup ? (msg.key.participant ?? jid) : jid;
  const senderName = msg.pushName ?? senderJid.split('@')[0];

  // Upsert chat in DB
  const chatName = isGroup ? jid : senderName;
  chatRepository.upsert(jid, chatName);

  // Check if agent is active for this chat
  if (!chatRepository.isAgentActive(jid)) return;

  let groupName: string | undefined;
  if (isGroup) {
    try {
      const meta = await sock.groupMetadata(jid);
      groupName = meta.subject;
      // Update chat name with actual group name
      chatRepository.upsert(jid, groupName);
    } catch {
      // Non-fatal
    }
  }

  // Show typing indicator
  try {
    await sock.sendPresenceUpdate('composing', jid);
  } catch {
    // Non-fatal
  }

  try {
    const result = await agent.run({
      jid,
      incomingMessage: text,
      senderName,
      isGroup,
      groupName,
    });

    if (result.finalText) {
      // Split long messages (WhatsApp limit ~4096 chars)
      const chunks = splitMessage(result.finalText, 4000);
      for (const chunk of chunks) {
        await sock.sendMessage(jid, { text: chunk });
      }
    }
  } finally {
    try {
      await sock.sendPresenceUpdate('paused', jid);
    } catch {
      // Non-fatal
    }
  }
}

function extractText(msg: WAMessage): string | null {
  const content = msg.message;
  if (!content) return null;
  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    null
  );
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, maxLen));
    remaining = remaining.slice(maxLen);
  }
  return chunks;
}
