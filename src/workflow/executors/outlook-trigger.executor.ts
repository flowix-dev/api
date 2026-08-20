import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";

const POLL_INTERVAL_MS = 5000;

async function fetchLatestOutlookEmail(
  accessToken: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/messages?$top=1&$orderby=receivedDateTime desc&$select=from,subject,bodyPreview,receivedDateTime",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    value?: Array<{
      id: string;
      from?: { emailAddress?: { address?: string } };
      subject?: string;
      bodyPreview?: string;
      receivedDateTime?: string;
    }>;
  };
  if (!data.value?.length) return null;
  const m = data.value[0];
  return {
    from: m.from?.emailAddress?.address ?? "",
    subject: m.subject ?? "",
    body: m.bodyPreview ?? "",
    date: m.receivedDateTime ?? "",
    id: m.id,
    receivedDateTime: m.receivedDateTime,
  };
}

export class OutlookTriggerExecutor implements INodeExecutor {
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

    if (!context?.userId) throw new Error("ExecutionContext requerido para Outlook Trigger");
    if (!String(inputs.credentials ?? "")) throw new Error("credentials es requerido");

    const timeout = Number(inputs.timeout ?? 300);
    const deadline = Date.now() + timeout * 1000;
    const startTime = Date.now();

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (context.isHalted) throw new Error("Ejecución cancelada");
      try {
        const { accessToken } = await getValidAccessToken(context.userId, "outlook");
        const latest = await fetchLatestOutlookEmail(accessToken);
        if (latest) {
          const ts = new Date((latest.receivedDateTime as string) ?? 0).getTime();
          if (ts > startTime) {
            return {
              outputs: {
                from: latest.from ?? "",
                subject: latest.subject ?? "",
                body: latest.body ?? "",
                date: latest.date ?? "",
                attachments: [],
              },
            };
          }
        }
      } catch {}
    }
    throw new Error(`Outlook Trigger timeout after ${timeout}s - no se recibió ningún email nuevo`);
  }
}
