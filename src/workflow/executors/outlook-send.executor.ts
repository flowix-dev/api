import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";

export class OutlookSendExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const to = String(inputs.to ?? "").trim();
    const subject = String(inputs.subject ?? "").trim();
    const body = String(inputs.body ?? "");
    if (!to || !subject || !body) {
      throw new Error("to, subject y body son requeridos");
    }
    if (!context?.userId) {
      throw new Error("No se pudo resolver el usuario");
    }

    const { accessToken } = await getValidAccessToken(context.userId, "outlook");

    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "text", content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Outlook send failed (${response.status}): ${text.slice(0, 200)}`);
    }

    return { outputs: { messageId: "" } };
  }
}
