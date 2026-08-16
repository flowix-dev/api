import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { converse } from "../../chat/puter";
import { ConverseMessage } from "../../chat/types";
import { getModelInfo, DEFAULT_MODEL_ID } from "../../chat/models";

export class AiChatExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    if (!context?.puterToken) {
      throw new Error("No hay token de Puter conectado");
    }

    const model = String(inputs.model ?? DEFAULT_MODEL_ID);
    const modelInfo = getModelInfo(model) ?? getModelInfo(DEFAULT_MODEL_ID)!;
    const system = String(inputs.system ?? "");
    const messages = toConverseMessages(inputs.messages);
    if (messages.length === 0) {
      throw new Error("messages es requerido");
    }
    const temperature = typeof inputs.temperature === "number" ? inputs.temperature : 0.7;
    const maxTokens = typeof inputs.maxTokens === "number" ? inputs.maxTokens : 2048;

    const { text } = await converse(context.puterToken, {
      modelId: modelInfo.modelId,
      system: system || undefined,
      messages,
      maxTokens,
      temperature,
    });

    return { outputs: { response: text, model: modelInfo.modelId } };
  }
}

function toConverseMessages(raw: unknown): ConverseMessage[] {
  const items = Array.isArray(raw) ? raw : typeof raw === "string" ? tryParse(raw) : [];
  if (!Array.isArray(items)) {
    return [];
  }
  const messages = items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const role: "assistant" | "user" = record.role === "assistant" ? "assistant" : "user";
      return {
        role,
        content: [{ text: String(record.content ?? "") }],
      } as ConverseMessage;
    })
    .filter((message): message is ConverseMessage => message !== null);
  return messages;
}

function tryParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
