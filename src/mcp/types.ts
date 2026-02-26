import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type Anthropic from '@anthropic-ai/sdk';
import type { McpServerConfig, McpTransportType } from '../db/repositories/mcpRepository.js';

export interface McpToolDefinition {
  serverId: string;
  toolName: string;
  qualifiedName: string;
  claudeTool: Anthropic.Tool;
}

export interface McpServerEntry {
  client: Client;
  tools: McpToolDefinition[];
  type: McpTransportType;
  config: McpServerConfig;
}

export interface ToolExecutionResult {
  content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>;
  isError?: boolean;
}
