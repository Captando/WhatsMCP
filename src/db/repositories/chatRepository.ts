import { getDb } from '../database.js';

export interface ChatSettings {
  jid: string;
  name: string;
  agent_active: boolean;
  created_at: string;
}

interface ChatRow {
  jid: string;
  name: string;
  agent_active: 0 | 1;
  created_at: string;
}

function rowToChat(row: ChatRow): ChatSettings {
  return { ...row, agent_active: row.agent_active === 1 };
}

export const chatRepository = {
  upsert(jid: string, name: string): void {
    getDb()
      .prepare(
        `INSERT INTO chat_settings (jid, name) VALUES (?, ?)
         ON CONFLICT(jid) DO UPDATE SET name = excluded.name`
      )
      .run(jid, name);
  },

  findByJid(jid: string): ChatSettings | null {
    const row = getDb()
      .prepare('SELECT * FROM chat_settings WHERE jid = ?')
      .get(jid) as ChatRow | undefined;
    return row ? rowToChat(row) : null;
  },

  getAll(): ChatSettings[] {
    const rows = getDb()
      .prepare('SELECT * FROM chat_settings ORDER BY created_at DESC')
      .all() as ChatRow[];
    return rows.map(rowToChat);
  },

  setAgentActive(jid: string, active: boolean): void {
    getDb()
      .prepare('UPDATE chat_settings SET agent_active = ? WHERE jid = ?')
      .run(active ? 1 : 0, jid);
  },

  isAgentActive(jid: string): boolean {
    const row = getDb()
      .prepare('SELECT agent_active FROM chat_settings WHERE jid = ?')
      .get(jid) as { agent_active: 0 | 1 } | undefined;
    return row?.agent_active === 1;
  },
};
