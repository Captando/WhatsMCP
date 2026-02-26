import { getDb } from '../database.js';

export type McpTransportType = 'stdio' | 'http' | 'sse';

export interface StdioConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface HttpConfig {
  url: string;
  headers?: Record<string, string>;
}

export type McpServerConfig = StdioConfig | HttpConfig;

export interface McpServer {
  id: string;
  name: string;
  type: McpTransportType;
  config: McpServerConfig;
  enabled: boolean;
}

interface McpRow {
  id: string;
  name: string;
  type: McpTransportType;
  config: string;
  enabled: 0 | 1;
}

function rowToServer(row: McpRow): McpServer {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config: JSON.parse(row.config) as McpServerConfig,
    enabled: row.enabled === 1,
  };
}

export const mcpRepository = {
  create(server: McpServer): void {
    getDb()
      .prepare(
        'INSERT INTO mcp_servers (id, name, type, config, enabled) VALUES (?, ?, ?, ?, ?)'
      )
      .run(server.id, server.name, server.type, JSON.stringify(server.config), server.enabled ? 1 : 0);
  },

  findById(id: string): McpServer | null {
    const row = getDb()
      .prepare('SELECT * FROM mcp_servers WHERE id = ?')
      .get(id) as McpRow | undefined;
    return row ? rowToServer(row) : null;
  },

  getAll(): McpServer[] {
    const rows = getDb().prepare('SELECT * FROM mcp_servers').all() as McpRow[];
    return rows.map(rowToServer);
  },

  getAllEnabled(): McpServer[] {
    const rows = getDb()
      .prepare('SELECT * FROM mcp_servers WHERE enabled = 1')
      .all() as McpRow[];
    return rows.map(rowToServer);
  },

  setEnabled(id: string, enabled: boolean): void {
    getDb()
      .prepare('UPDATE mcp_servers SET enabled = ? WHERE id = ?')
      .run(enabled ? 1 : 0, id);
  },

  delete(id: string): void {
    getDb().prepare('DELETE FROM mcp_servers WHERE id = ?').run(id);
  },

  exists(id: string): boolean {
    const row = getDb()
      .prepare('SELECT id FROM mcp_servers WHERE id = ?')
      .get(id);
    return row != null;
  },
};
