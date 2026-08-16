import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { postJson } from "./http-helper";

export class SlackSendExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const webhookUrl = String(inputs.webhookUrl ?? "").trim();
    const text = String(inputs.text ?? "");
    if (!webhookUrl) {
      throw new Error("webhookUrl es requerido");
    }
    if (!text) {
      throw new Error("text es requerido");
    }

    const body: Record<string, unknown> = { text };
    if (inputs.channel) {
      body.channel = inputs.channel;
    }

    const { status, data } = await postJson(webhookUrl, body);
    return { outputs: { status, data } };
  }
}
