import Anthropic from '@anthropic-ai/sdk';
import { messageRepository } from '../db/repositories/messageRepository.js';
import { settingsRepository } from '../db/repositories/settingsRepository.js';
import type { McpManager } from '../mcp/mcpManager.js';
import type { AgentRunContext, AgentRunResult } from './types.js';

const MAX_LOOP_ITERATIONS = 10;

export class ClaudeAgent {
  private anthropic: Anthropic;

  constructor(private mcpManager: McpManager) {
    this.anthropic = new Anthropic();
  }

  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    const settings = settingsRepository.getAll();
    const history = messageRepository.getHistory(ctx.jid, settings.max_history_messages);

    const userContent = this.buildUserContent(ctx);
    messageRepository.save(ctx.jid, 'user', userContent);

    const messages: Anthropic.MessageParam[] = [
      ...history,
      { role: 'user', content: userContent },
    ];

    const tools = this.mcpManager.getAllTools();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let toolCallCount = 0;

    for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration++) {
      const response = await this.anthropic.messages.create({
        model: settings.model,
        max_tokens: settings.max_tokens,
        system: settings.system_prompt,
        tools: tools.length > 0 ? tools : undefined,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
        const finalText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n');

        messageRepository.save(ctx.jid, 'assistant', response.content);

        return { finalText, toolCallCount, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        );
        toolCallCount += toolUseBlocks.length;

        const toolResults = await Promise.allSettled(
          toolUseBlocks.map((tb) =>
            this.mcpManager.executeTool(tb.name, tb.input as Record<string, unknown>)
          )
        );

        const toolResultContent: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((tb, i) => {
          const result = toolResults[i];
          if (result.status === 'fulfilled') {
            return {
              type: 'tool_result' as const,
              tool_use_id: tb.id,
              content: result.value.content
                .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
                .map((c) => ({ type: 'text' as const, text: c.text })),
            };
          } else {
            return {
              type: 'tool_result' as const,
              tool_use_id: tb.id,
              is_error: true,
              content: [{ type: 'text' as const, text: String(result.reason) }],
            };
          }
        });

        messages.push({ role: 'user', content: toolResultContent });
        continue;
      }

      // Unexpected stop reason
      break;
    }

    const finalText = '[Agente atingiu o limite máximo de iterações de ferramentas]';
    messageRepository.save(ctx.jid, 'assistant', [{ type: 'text', text: finalText }]);
    return { finalText, toolCallCount, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
  }

  private buildUserContent(ctx: AgentRunContext): Anthropic.MessageParam['content'] {
    let text = ctx.incomingMessage;
    if (ctx.isGroup) {
      const prefix = ctx.groupName ? `[${ctx.groupName}] ` : '';
      const sender = ctx.senderName ?? 'Usuário';
      text = `${prefix}${sender}: ${text}`;
    }
    return [{ type: 'text', text }];
  }
}
