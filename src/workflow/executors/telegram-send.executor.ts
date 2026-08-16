import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { postJson } from "./http-helper";

const API_BASE = "https://api.telegram.org";

export class TelegramSendExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const botToken = String(inputs.botToken ?? "").trim();
    const chatId = String(inputs.chatId ?? "").trim();
    const text = String(inputs.text ?? "");
    if (!botToken) {
      throw new Error("botToken es requerido");
    }
    if (!chatId) {
      throw new Error("chatId es requerido");
    }
    if (!text) {
      throw new Error("text es requerido");
    }

    const { status, data } = await postJson(`${API_BASE}/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: inputs.parseMode || undefined,
    });

    return { outputs: { status, data } };
  }
}
