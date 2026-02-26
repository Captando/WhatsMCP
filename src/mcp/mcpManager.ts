import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type Anthropic from '@anthropic-ai/sdk';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpServer, StdioConfig, HttpConfig } from '../db/repositories/mcpRepository.js';
import type { McpServerEntry, McpToolDefinition, ToolExecutionResult } from './types.js';
import { mcpRepository } from '../db/repositories/mcpRepository.js';

const TOOL_TIMEOUT_MS = 30_000;

export class McpManager {
  private servers = new Map<string, McpServerEntry>();

  async addServer(server: McpServer): Promise<void> {
    if (this.servers.has(server.id)) {
      await this.removeServer(server.id);
    }

    const transport = this.buildTransport(server);
    const client = new Client({ name: 'chatmcp', version: '1.0.0' });

    await client.connect(transport);

    const { tools } = await client.listTools();

    const toolDefs: McpToolDefinition[] = tools.map((t) => ({
      serverId: server.id,
      toolName: t.name,
      qualifiedName: `${server.id}__${t.name}`,
      claudeTool: {
        name: `${server.id}__${t.name}`,
        description: t.description ?? '',
        input_schema: (t.inputSchema ?? { type: 'object', properties: {} }) as Anthropic.Tool['input_schema'],
      },
    }));

    this.servers.set(server.id, {
      client,
      tools: toolDefs,
      type: server.type,
      config: server.config,
    });

    console.log(`[MCP] Connected "${server.name}" (${server.id}) — ${toolDefs.length} tools`);
  }

  async removeServer(id: string): Promise<void> {
    const entry = this.servers.get(id);
    if (!entry) return;
    try {
      await entry.client.close();
    } catch {
      // Ignore close errors
    }
    this.servers.delete(id);
    console.log(`[MCP] Disconnected "${id}"`);
  }

  getAllTools(): Anthropic.Tool[] {
    return [...this.servers.values()].flatMap((e) => e.tools.map((t) => t.claudeTool));
  }

  getConnectedIds(): string[] {
    return [...this.servers.keys()];
  }

  async executeTool(qualifiedName: string, input: Record<string, unknown>): Promise<ToolExecutionResult> {
    const separatorIdx = qualifiedName.indexOf('__');
    if (separatorIdx === -1) {
      throw new Error(`Invalid tool name format: "${qualifiedName}"`);
    }
    const serverId = qualifiedName.slice(0, separatorIdx);
    const toolName = qualifiedName.slice(separatorIdx + 2);

    const entry = this.servers.get(serverId);
    if (!entry) {
      throw new Error(`MCP server "${serverId}" not connected`);
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${TOOL_TIMEOUT_MS}ms`)), TOOL_TIMEOUT_MS)
    );

    const callPromise = entry.client.callTool({ name: toolName, arguments: input });

    const result = await Promise.race([callPromise, timeoutPromise]);
    return result as ToolExecutionResult;
  }

  async loadFromDb(): Promise<void> {
    const servers = mcpRepository.getAllEnabled();
    for (const server of servers) {
      try {
        await this.addServer(server);
      } catch (err) {
        console.error(`[MCP] Failed to load server "${server.id}":`, err);
      }
    }
  }

  async shutdownAll(): Promise<void> {
    const ids = [...this.servers.keys()];
    await Promise.allSettled(ids.map((id) => this.removeServer(id)));
  }

  private buildTransport(server: McpServer): Transport {
    switch (server.type) {
      case 'stdio': {
        const c = server.config as StdioConfig;
        return new StdioClientTransport({
          command: c.command,
          args: c.args ?? [],
          env: c.env,
        });
      }
      case 'http': {
        const c = server.config as HttpConfig;
        return new StreamableHTTPClientTransport(new URL(c.url), {
          requestInit: c.headers ? { headers: c.headers } : undefined,
        });
      }
      case 'sse': {
        const c = server.config as HttpConfig;
        return new SSEClientTransport(new URL(c.url));
      }
    }
  }
}

export const mcpManager = new McpManager();
