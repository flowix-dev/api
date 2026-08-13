export interface ConverseToolUseBlock {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ConverseToolResultBlock {
  toolUseId: string;
  content: Array<{ text?: string; json?: unknown }>;
  status?: "success" | "error";
}

export interface ConverseContentBlock {
  text?: string;
  toolUse?: ConverseToolUseBlock;
  toolResult?: ConverseToolResultBlock;
}

export interface ConverseMessage {
  role: "user" | "assistant";
  content: ConverseContentBlock[];
}

export interface ConverseTool {
  toolSpec: {
    name: string;
    description?: string;
    inputSchema: { json: Record<string, unknown> };
  };
}

export interface StreamedToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ConverseStreamParams {
  modelId: string;
  system?: string;
  messages: ConverseMessage[];
  tools?: ConverseTool[];
  maxTokens?: number;
  temperature?: number;
}

export interface StreamResult {
  text: string;
  toolUses: StreamedToolUse[];
}
