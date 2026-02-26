import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { statusRouter } from './routes/status.js';
import { chatsRouter } from './routes/chats.js';
import { mcpRouter } from './routes/mcp.js';
import { settingsRouter } from './routes/settings.js';
import { messagesRouter } from './routes/messages.js';
import type { WhatsAppClient } from '../whatsapp/whatsappClient.js';
import type { McpManager } from '../mcp/mcpManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApiServer(whatsapp: WhatsAppClient, mcpManager: McpManager): express.Express {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));

  app.use('/api/status', statusRouter(whatsapp));
  app.use('/api/chats', chatsRouter());
  app.use('/api/mcp-servers', mcpRouter(mcpManager));
  app.use('/api/settings', settingsRouter());
  app.use('/api/messages', messagesRouter());

  // Fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
  });

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API Error]', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  });

  return app;
}
