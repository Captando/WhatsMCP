export interface AgentRunContext {
  jid: string;
  incomingMessage: string;
  senderName?: string;
  isGroup: boolean;
  groupName?: string;
}

export interface AgentRunResult {
  finalText: string;
  toolCallCount: number;
  inputTokens: number;
  outputTokens: number;
}
