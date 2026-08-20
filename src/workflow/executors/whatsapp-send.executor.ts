import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";

export class WhatsAppSendExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    let phoneNumberId = String(inputs.phoneNumberId ?? "");
    const to = String(inputs.to ?? "");
    const text = String(inputs.text ?? "");
    let accessToken = String(inputs.accessToken ?? "");

    if (inputs.credentials && context?.userId) {
      try {
        const cred = await getValidAccessToken(context.userId, "whatsapp");
        accessToken = cred.accessToken;
      } catch {}
    }

    if (!phoneNumberId && accessToken) {
      try {
        const res = await fetch("https://graph.facebook.com/v19.0/me/phone_numbers?fields=id", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { data?: Array<{ id: string }> };
          phoneNumberId = data.data?.[0]?.id ?? "";
        }
      } catch {}
      if (!phoneNumberId) {
        try {
          const res2 = await fetch("https://graph.facebook.com/v19.0/me?fields=phone_numbers{id}", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res2.ok) {
            const d2 = (await res2.json()) as { phone_numbers?: { data?: Array<{ id: string }> } };
            phoneNumberId = d2.phone_numbers?.data?.[0]?.id ?? "";
          }
        } catch {}
      }
    }

    if (!phoneNumberId || !accessToken || !to || !text) {
      throw new Error(
        "phoneNumberId, to, text y accessToken (o credentials) son requeridos — si usás credentials, el Phone Number ID se auto-detecta si lo dejás vacío"
      );
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
