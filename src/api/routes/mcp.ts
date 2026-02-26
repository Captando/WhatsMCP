import { Router } from 'express';
import { mcpRepository } from '../../db/repositories/mcpRepository.js';
import type { McpServer, McpTransportType } from '../../db/repositories/mcpRepository.js';
import type { McpManager } from '../../mcp/mcpManager.js';

export function mcpRouter(mcpManager: McpManager): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const servers = mcpRepository.getAll();
    const connectedIds = mcpManager.getConnectedIds();
    res.json(
      servers.map((s) => ({
        ...s,
        connected: connectedIds.includes(s.id),
      }))
    );
  });

  router.post('/', async (req, res) => {
    const { id, name, type, config } = req.body as McpServer;

    if (!id || !name || !type || !config) {
      res.status(400).json({ error: 'id, name, type, and config are required' });
      return;
    }

    const validTypes: McpTransportType[] = ['stdio', 'http', 'sse'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
      return;
    }

    if (mcpRepository.exists(id)) {
      res.status(409).json({ error: `Server with id "${id}" already exists` });
      return;
    }

    const server: McpServer = { id, name, type, config, enabled: true };

    try {
      await mcpManager.addServer(server);
      mcpRepository.create(server);
      res.status(201).json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: `Failed to connect: ${String(err)}` });
    }
  });

  router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (!mcpRepository.exists(id)) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    await mcpManager.removeServer(id);
    mcpRepository.delete(id);
    res.json({ success: true });
  });

  router.patch('/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const server = mcpRepository.findById(id);

    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    try {
      if (server.enabled) {
        await mcpManager.removeServer(id);
        mcpRepository.setEnabled(id, false);
        res.json({ success: true, enabled: false });
      } else {
        await mcpManager.addServer({ ...server, enabled: true });
        mcpRepository.setEnabled(id, true);
        res.json({ success: true, enabled: true });
      }
    } catch (err) {
      res.status(500).json({ error: `Operation failed: ${String(err)}` });
    }
  });

  return router;
}
