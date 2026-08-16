import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class WhatsAppSendExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const phoneNumberId = inputs.phoneNumberId as string;
    const accessToken = inputs.accessToken as string;
    const to = inputs.to as string;
    const text = inputs.text as string;

    if (!phoneNumberId || !accessToken || !to || !text) {
      throw new Error("phoneNumberId, accessToken, to, and text are required");
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;
    const messages = data.messages as Array<Record<string, unknown>> | undefined;
    const messageId = messages?.[0]?.id ?? null;

    return {
      outputs: {
        status: response.status,
        messageId,
        data,
      },
    };
  }
}
