import type Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../database.js';

interface MessageRow {
  id: number;
  jid: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const messageRepository = {
  save(jid: string, role: 'user' | 'assistant', content: Anthropic.MessageParam['content']): void {
    getDb()
      .prepare('INSERT INTO messages (jid, role, content) VALUES (?, ?, ?)')
      .run(jid, role, JSON.stringify(content));
  },

  getHistory(jid: string, limit: number): Anthropic.MessageParam[] {
    const rows = getDb()
      .prepare(
        `SELECT role, content FROM messages
         WHERE jid = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`
      )
      .all(jid, limit) as Pick<MessageRow, 'role' | 'content'>[];

    return rows.reverse().map((r) => ({
      role: r.role,
      content: JSON.parse(r.content) as Anthropic.MessageParam['content'],
    }));
  },

  getForJid(jid: string, limit = 50): Array<{ role: string; content: string; created_at: string }> {
    return getDb()
      .prepare(
        `SELECT role, content, created_at FROM messages
         WHERE jid = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`
      )
      .all(jid, limit) as Array<{ role: string; content: string; created_at: string }>;
  },

  clearForJid(jid: string): void {
    getDb().prepare('DELETE FROM messages WHERE jid = ?').run(jid);
  },
};
