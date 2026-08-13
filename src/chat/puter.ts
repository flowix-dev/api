import { createRequire } from "node:module";
import type {
  ConverseContentBlock,
  ConverseMessage,
  ConverseStreamParams,
  ConverseTool,
  StreamedToolUse,
  StreamResult,
} from "./types";

const nodeRequire = createRequire(__filename);
const puterInit = nodeRequire("@heyputer/puter.js/src/init.cjs") as {
  init: (authToken?: string) => PuterClient;
};

const clientCache = new Map<string, PuterClient>();

class WebSocketStub {
  private _onopen: unknown = null;
  private _onmessage: unknown = null;
  private _onerror: unknown = null;
  private _onclose: unknown = null;

  constructor(_url: string) {}

  send(): void {}
  close(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}

  set onopen(value: unknown) {
    this._onopen = value;
  }
  get onopen(): unknown {
    return this._onopen;
  }
  set onmessage(value: unknown) {
    this._onmessage = value;
  }
  get onmessage(): unknown {
    return this._onmessage;
  }
  set onerror(value: unknown) {
    this._onerror = value;
  }
  get onerror(): unknown {
    return this._onerror;
  }
  set onclose(value: unknown) {
    this._onclose = value;
  }
  get onclose(): unknown {
    return this._onclose;
  }
}

function getClient(authToken: string): PuterClient {
  let client = clientCache.get(authToken);
  if (!client) {
    const originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = WebSocketStub as unknown as typeof WebSocket;
    try {
      client = puterInit.init(authToken);
    } finally {
      globalThis.WebSocket = originalWebSocket;
    }
    clientCache.set(authToken, client);
  }
  return client;
}

interface PuterClient {
  ai: {
    chat: (...args: unknown[]) => Promise<unknown>;
  };
  auth: {
    getMonthlyUsage?: () => Promise<unknown>;
  };
}

interface PuterChatChunk {
  type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  message?: string;
}

interface PuterToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface PuterChatResponse {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
    tool_calls?: PuterToolCall[];
  };
}

export interface PuterUsage {
  allowanceInfo?: {
    monthUsageAllowance?: number;
    remaining?: number;
  };
  appTotals?: Record<string, { count?: number; total?: number }>;
  usage?: Record<string, { cost?: number; count?: number; units?: number }>;
}

function toPuterMessages(messages: ConverseMessage[]): unknown[] {
  const output: unknown[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      const texts: string[] = [];
      const toolResults: NonNullable<ConverseContentBlock["toolResult"]>[] = [];

      for (const block of message.content) {
        if (block.text) {
          texts.push(block.text);
        }
        if (block.toolResult) {
          toolResults.push(block.toolResult);
        }
      }

      for (const toolResult of toolResults) {
        output.push({
          role: "tool",
          tool_call_id: toolResult.toolUseId,
          content: serializeToolResult(toolResult),
        });
      }

      if (texts.length > 0) {
        output.push({ role: "user", content: texts.join("\n") });
      }
    } else {
      const texts: string[] = [];
      const toolUses: NonNullable<ConverseContentBlock["toolUse"]>[] = [];

      for (const block of message.content) {
        if (block.text) {
          texts.push(block.text);
        }
        if (block.toolUse) {
          toolUses.push(block.toolUse);
        }
      }

      const assistant: Record<string, unknown> = {
        role: "assistant",
        content: texts.join("\n"),
      };
      if (toolUses.length > 0) {
        assistant.tool_calls = toolUses.map((toolUse) => ({
          id: toolUse.toolUseId,
          type: "function",
          function: {
            name: toolUse.name,
            arguments: JSON.stringify(toolUse.input ?? {}),
          },
        }));
      }
      output.push(assistant);
    }
  }

  return output;
}

function toPuterTools(tools: ConverseTool[]): unknown[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.toolSpec.name,
      description: tool.toolSpec.description,
      parameters: tool.toolSpec.inputSchema.json,
    },
  }));
}

function serializeToolResult(toolResult: NonNullable<ConverseContentBlock["toolResult"]>): string {
  const parts = (toolResult.content ?? []).map((content) => {
    if (content.json !== undefined) {
      return JSON.stringify(content.json);
    }
    return content.text ?? "";
  });
  return parts.join("\n") || "ok";
}

function parseToolArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function buildPuterMessages(params: ConverseStreamParams): unknown[] {
  const system = params.system ? [{ role: "system", content: params.system }] : [];
  return [...system, ...toPuterMessages(params.messages)];
}

export async function streamConverse(
  authToken: string,
  params: ConverseStreamParams,
  onTextDelta?: (delta: string) => void
): Promise<StreamResult> {
  const puter = getClient(authToken);
  const response = (await puter.ai.chat(buildPuterMessages(params), {
    model: params.modelId,
    stream: true,
    tools: toPuterTools(params.tools ?? []),
    max_tokens: params.maxTokens ?? 2048,
    temperature: params.temperature ?? 0.7,
  })) as AsyncIterable<PuterChatChunk>;

  let text = "";
  const toolUses: StreamedToolUse[] = [];

  for await (const part of response) {
    if (part?.type === "text" && part.text) {
      text += part.text;
      onTextDelta?.(part.text);
    } else if (part?.type === "tool_use") {
      toolUses.push({
        id: part.id ?? "",
        name: part.name ?? "",
        input: part.input ?? {},
      });
    } else if (part?.type === "error") {
      throw new Error(part.message || "Puter stream error");
    }
  }

  return { text, toolUses };
}

export async function getPuterUsage(authToken: string): Promise<PuterUsage> {
  const puter = getClient(authToken);
  if (!puter.auth.getMonthlyUsage) {
    throw new Error("Puter usage API not available");
  }
  return (await puter.auth.getMonthlyUsage()) as PuterUsage;
}

export async function transcribeImageWithPuter(
  authToken: string,
  imageDataUrl: string
): Promise<string> {
  const puter = getClient(authToken);
  const response = (await puter.ai.chat(
    "Transcribí el texto de esta imagen o, si no tiene texto legible, describí su contenido en español.",
    imageDataUrl,
    false,
    { model: "gpt-5.4-nano", max_tokens: 1024 }
  )) as PuterChatResponse;

  const content = response?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((block) => block?.text ?? "")
      .join("\n")
      .trim();
  }
  return "";
}

export async function converse(
  authToken: string,
  params: ConverseStreamParams
): Promise<StreamResult> {
  const puter = getClient(authToken);
  const response = (await puter.ai.chat(buildPuterMessages(params), {
    model: params.modelId,
    tools: toPuterTools(params.tools ?? []),
    max_tokens: params.maxTokens ?? 2048,
    temperature: params.temperature ?? 0.7,
  })) as PuterChatResponse;

  let text = "";
  const toolUses: StreamedToolUse[] = [];

  const content = response?.message?.content;
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === "text") {
        text += block.text ?? "";
      }
    }
  }

  for (const toolCall of response?.message?.tool_calls ?? []) {
    toolUses.push({
      id: toolCall.id ?? "",
      name: toolCall.function?.name ?? "",
      input: parseToolArguments(toolCall.function?.arguments),
    });
  }

  return { text, toolUses };
}
