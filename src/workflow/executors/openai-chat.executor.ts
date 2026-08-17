import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const OPENAI_API = "https://api.openai.com/v1";

export class OpenAIChatExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const apiKey = String(inputs.apiKey ?? "").trim();
    const model = String(inputs.model ?? "gpt-4o-mini").trim();
    const system = String(inputs.system ?? "").trim();
    const messagesRaw = String(inputs.messages ?? "[]").trim();
    const temperature = Number(inputs.temperature ?? 0.7);
    const maxTokens = Number(inputs.maxTokens ?? 2048);

    if (!apiKey) {
      throw new Error("apiKey es requerida");
    }

    let messages: Array<{ role: string; content: string }>;
    try {
      messages = JSON.parse(messagesRaw);
      if (!Array.isArray(messages)) {
        throw new Error("messages debe ser un array");
      }
    } catch {
      throw new Error("messages debe ser un JSON array válido");
    }

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    if (system) {
      body.messages = [{ role: "system", content: system }, ...messages];
    }

    const response = await fetch(`${OPENAI_API}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI error: ${(error as { error?: { message?: string } })?.error?.message ?? response.status}`
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      model?: string;
    };

    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? "";

    return {
      outputs: {
        response: content,
        model: data.model ?? model,
        finishReason: choice?.finish_reason ?? "",
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }
}
