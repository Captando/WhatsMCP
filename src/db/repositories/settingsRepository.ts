import { getDb } from '../database.js';

export interface AppSettings {
  system_prompt: string;
  model: string;
  max_tokens: number;
  max_history_messages: number;
}

export const settingsRepository = {
  get(key: string): string | null {
    const row = getDb()
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  },

  set(key: string, value: string): void {
    getDb()
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value);
  },

  getAll(): AppSettings {
    const rows = getDb()
      .prepare('SELECT key, value FROM settings')
      .all() as Array<{ key: string; value: string }>;

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      system_prompt: map.system_prompt ?? 'Você é um assistente útil.',
      model: map.model ?? 'claude-sonnet-4-6',
      max_tokens: parseInt(map.max_tokens ?? '8096', 10),
      max_history_messages: parseInt(map.max_history_messages ?? '50', 10),
    };
  },

  setMany(updates: Partial<AppSettings>): void {
    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    const transaction = db.transaction((entries: Array<[string, string]>) => {
      for (const [key, value] of entries) {
        stmt.run(key, value);
      }
    });
    transaction(
      Object.entries(updates).map(([k, v]) => [k, String(v)] as [string, string])
    );
  },
};
