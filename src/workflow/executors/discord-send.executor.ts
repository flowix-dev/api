import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { postJson } from "./http-helper";

export class DiscordSendExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const webhookUrl = String(inputs.webhookUrl ?? "").trim();
    const text = String(inputs.text ?? "");
    if (!webhookUrl) {
      throw new Error("webhookUrl es requerido");
    }
    if (!text) {
      throw new Error("text es requerido");
    }

    const body: Record<string, unknown> = { content: text };
    if (inputs.username) {
      body.username = inputs.username;
    }

    const { status, data } = await postJson(webhookUrl, body);
    return { outputs: { status, data } };
  }
}
