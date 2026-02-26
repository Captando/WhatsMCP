import type Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_settings (
      jid          TEXT PRIMARY KEY,
      name         TEXT NOT NULL DEFAULT '',
      agent_active INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      jid        TEXT NOT NULL,
      role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_jid_created ON messages(jid, created_at);

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id      TEXT PRIMARY KEY,
      name    TEXT NOT NULL,
      type    TEXT NOT NULL CHECK(type IN ('stdio','http','sse')),
      config  TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wa_auth (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings VALUES ('system_prompt', 'Você é um assistente útil no WhatsApp. Responda de forma clara e concisa.');
    INSERT OR IGNORE INTO settings VALUES ('model', 'claude-sonnet-4-6');
    INSERT OR IGNORE INTO settings VALUES ('max_tokens', '8096');
    INSERT OR IGNORE INTO settings VALUES ('max_history_messages', '50');
  `);
}
