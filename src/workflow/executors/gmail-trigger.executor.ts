import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";

const POLL_INTERVAL_MS = 5000;

async function fetchLatestGmailEmail(accessToken: string): Promise<Record<string, unknown> | null> {
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=in:inbox",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) return null;
  const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
  if (!listData.messages?.length) return null;
  const msgId = listData.messages[0].id;
  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!msgRes.ok) return null;
  const msgData = (await msgRes.json()) as {
    id: string;
    payload?: { headers?: Array<{ name: string; value: string }> };
    internalDate?: string;
  };
  const headers = msgData.payload?.headers ?? [];
  return {
    from: headers.find((h) => h.name === "From")?.value ?? "",
    subject: headers.find((h) => h.name === "Subject")?.value ?? "",
    body: "",
    date: headers.find((h) => h.name === "Date")?.value ?? "",
    attachments: [],
    id: msgData.id,
    internalDate: msgData.internalDate,
  };
}

export class GmailTriggerExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const raw = context?.triggerData;
    if (raw) {
      let data: Record<string, unknown> = {};
      if (typeof raw === "string") {
        try {
          data = JSON.parse(raw);
        } catch {
          data = {};
        }
      } else if (typeof raw === "object" && raw !== null) {
        data = raw as Record<string, unknown>;
      }
      return {
        outputs: {
          from: data.from ?? "",
          subject: data.subject ?? "",
          body: data.body ?? "",
          date: data.date ?? "",
          attachments: data.attachments ?? [],
        },
      };
    }

    if (!context?.userId) throw new Error("ExecutionContext requerido para Gmail Trigger");

    const credentialsId = String(inputs.credentials ?? "");
    if (!credentialsId) throw new Error("credentials es requerido");

    const timeout = Number(inputs.timeout ?? 300);
    const deadline = Date.now() + timeout * 1000;
    const startTime = Date.now();

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (context.isHalted) throw new Error("Ejecución cancelada");

      try {
        const { accessToken } = await getValidAccessToken(context.userId, "gmail");
        const latest = await fetchLatestGmailEmail(accessToken);
        if (latest) {
          const internalDate = Number(latest.internalDate ?? 0);
          if (internalDate > startTime) {
            return {
              outputs: {
                from: latest.from ?? "",
                subject: latest.subject ?? "",
                body: latest.body ?? "",
                date: latest.date ?? "",
                attachments: latest.attachments ?? [],
              },
            };
          }
        }
      } catch {}
    }

    throw new Error(`Gmail Trigger timeout after ${timeout}s - no se recibió ningún email nuevo`);
  }
}
