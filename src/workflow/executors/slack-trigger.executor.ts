import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";

const POLL_INTERVAL_MS = 5000;

async function fetchLatestSlackMessage(
  token: string,
  channelId?: string
): Promise<Record<string, unknown> | null> {
  if (channelId) {
    const res = await fetch(
      `https://slack.com/api/conversations.history?channel=${channelId}&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      messages?: Array<{ ts: string; text: string; user: string; channel?: string }>;
    };
    if (!data.ok || !data.messages?.length) return null;
    const m = data.messages[0];
    return { channel_id: channelId, text: m.text, user_id: m.user, ts: m.ts };
  }

  const listRes = await fetch(
    "https://slack.com/api/conversations.list?limit=5&types=public_channel,private_channel,im,mpim",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!listRes.ok) return null;
  const listData = (await listRes.json()) as { ok?: boolean; channels?: Array<{ id: string }> };
  if (!listData.ok || !listData.channels?.length) return null;
  for (const ch of listData.channels.slice(0, 2)) {
    const res = await fetch(
      `https://slack.com/api/conversations.history?channel=${ch.id}&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) continue;
    const data = (await res.json()) as {
      ok?: boolean;
      messages?: Array<{ ts: string; text: string; user: string }>;
    };
    if (data.ok && data.messages?.length) {
      const m = data.messages[0];
      return { channel_id: ch.id, text: m.text, user_id: m.user, ts: m.ts };
    }
  }
  return null;
}

export class SlackTriggerExecutor implements INodeExecutor {
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
      const channelType = String(data.channel_type ?? "");
      let messageType = "channel";
      if (channelType === "D") messageType = "dm";
      else if (channelType === "G") messageType = "group";
      return {
        outputs: {
          channel: data.channel_name ?? data.channel_id ?? data.channel ?? "",
          user: data.user_name ?? data.user_id ?? data.user ?? "",
          text: data.text ?? "",
          team: data.team_domain ?? data.team_id ?? data.team ?? "",
          timestamp: data.ts ?? data.timestamp ?? "",
          messageType,
        },
      };
    }

    if (!context?.userId) throw new Error("ExecutionContext requerido para Slack Trigger");
    if (!String(inputs.credentials ?? "")) throw new Error("credentials es requerido");
    const channelId = inputs.channelId ? String(inputs.channelId) : undefined;
    const timeout = Number(inputs.timeout ?? 300);
    const deadline = Date.now() + timeout * 1000;
    const startTime = Date.now();
    let seenTs: string | null = null;
    try {
      const { accessToken } = await getValidAccessToken(context.userId, "slack");
      const first = await fetchLatestSlackMessage(accessToken, channelId);
      seenTs = (first?.ts as string) ?? null;
    } catch {}

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (context.isHalted) throw new Error("Ejecución cancelada");
      try {
        const { accessToken } = await getValidAccessToken(context.userId, "slack");
        const latest = await fetchLatestSlackMessage(accessToken, channelId);
        if (latest && (latest.ts as string) !== seenTs) {
          const ts = Number((latest.ts as string) ?? 0) * 1000;
          if (!seenTs || ts > startTime) {
            return {
              outputs: {
                channel: latest.channel_id ?? "",
                user: latest.user_id ?? "",
                text: latest.text ?? "",
                team: "",
                timestamp: latest.ts ?? "",
                messageType: "channel",
              },
            };
          }
          seenTs = latest.ts as string;
        }
      } catch {}
    }
    throw new Error(`Slack Trigger timeout after ${timeout}s - no se recibió ningún mensaje nuevo`);
  }
}
