import 'dotenv/config';
import { getDb } from './db/database.js';
import { initializeSchema } from './db/schema.js';
import { mcpManager } from './mcp/mcpManager.js';
import { ClaudeAgent } from './agent/claudeAgent.js';
import { whatsappClient } from './whatsapp/whatsappClient.js';
import { createApiServer } from './api/server.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  console.log('🚀 Starting ChatMCP...');

  // 1. Init DB
  const db = getDb();
  initializeSchema(db);
  console.log('[DB] Schema initialized');

  // 2. Load MCP servers from DB
  await mcpManager.loadFromDb();

  // 3. Start Express admin panel
  const app = createApiServer(whatsappClient, mcpManager);
  await new Promise<void>((resolve) => app.listen(PORT, () => resolve()));
  console.log(`[API] Admin panel: http://localhost:${PORT}`);

  // 4. Connect WhatsApp
  const agent = new ClaudeAgent(mcpManager);
  await whatsappClient.connect(agent);
  console.log('[WA] Connecting to WhatsApp...');

  // 5. Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[App] ${signal} received — shutting down...`);
    await mcpManager.shutdownAll();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[App] Fatal error:', err);
  process.exit(1);
});
