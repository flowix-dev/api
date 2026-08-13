import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";

export class GmailSendExecutor implements INodeExecutor {
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

    const { accessToken } = await getValidAccessToken(context.userId, "gmail");
    const raw = Buffer.from(
      `From: \r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`,
      "utf8"
    ).toString("base64url");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    const data = (await response.json()) as { id?: string; error?: { message?: string } };
    if (!response.ok) {
      throw new Error(data.error?.message || "Gmail send failed");
    }

    return { outputs: { messageId: data.id ?? "" } };
  }
}
