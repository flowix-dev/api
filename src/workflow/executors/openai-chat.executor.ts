import OpenAI from "openai";
import { INodeExecutor, ExecutorResult } from "./registry";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export class OpenAIChatExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const model = (inputs.model as string) || "gpt-4o-mini";
    const messages = (inputs.messages as Array<{ role: string; content: string }>) || [];
    const temperature = (inputs.temperature as number) ?? 0.7;
    const maxTokens = inputs.maxTokens as number | undefined;

    if (messages.length === 0) {
      throw new Error("At least one message is required");
    }

    const completion = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
    });

    const choice = completion.choices[0];

    return {
      outputs: {
        response: choice?.message?.content || "",
        role: choice?.message?.role || "assistant",
        finishReason: choice?.finish_reason || null,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : null,
        model: completion.model,
      },
    };
  }
}
