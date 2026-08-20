import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";

const POLL_INTERVAL_MS = 5000;

async function fetchLatestDiscordMessage(
  accessToken: string,
  channelId?: string
): Promise<Record<string, unknown> | null> {
  if (channelId) {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=1`, {
      headers: { Authorization: `Bot ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      id: string;
      channel_id: string;
      content: string;
      timestamp: string;
      guild_id?: string;
      author: { username: string; id: string };
    }>;
    if (!data.length) return null;
    const m = data[0];
    return {
      channel_id: m.channel_id,
      content: m.content,
      timestamp: m.timestamp,
      guild_id: m.guild_id ?? "",
      author: m.author,
    };
  }

  const guildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!guildsRes.ok) return null;
  const guilds = (await guildsRes.json()) as Array<{ id: string }>;
  for (const g of guilds.slice(0, 3)) {
    const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${g.id}/channels`, {
      headers: { Authorization: `Bot ${accessToken}` },
    });
    if (!channelsRes.ok) continue;
    const channels = (await channelsRes.json()) as Array<{ id: string; type: number }>;
    const textChannel = channels.find((c) => c.type === 0);
    if (!textChannel) continue;
    const msgsRes = await fetch(
      `https://discord.com/api/v10/channels/${textChannel.id}/messages?limit=1`,
      { headers: { Authorization: `Bot ${accessToken}` } }
    );
    if (!msgsRes.ok) continue;
    const msgs = (await msgsRes.json()) as Array<{
      id: string;
      channel_id: string;
      content: string;
      timestamp: string;
      guild_id?: string;
      author: { username: string; id: string };
    }>;
    if (msgs.length) {
      const m = msgs[0];
      return {
        channel_id: m.channel_id,
        content: m.content,
        timestamp: m.timestamp,
        guild_id: m.guild_id ?? g.id,
        author: m.author,
      };
    }
  }
  return null;
}

export class DiscordTriggerExecutor implements INodeExecutor {
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
      const author = data.author as Record<string, unknown> | undefined;
      const guildId = data.guild_id ?? "";
      let messageType = "channel";
      if (!guildId) messageType = "dm";
      else if (data.type === 3) messageType = "group";
      return {
        outputs: {
          channelId: data.channel_id ?? "",
          author: author?.username ?? author?.id ?? "",
          content: data.content ?? "",
          guildId,
          timestamp: data.timestamp ?? "",
          messageType,
        },
      };
    }

    if (!context?.userId) throw new Error("ExecutionContext requerido para Discord Trigger");
    const cred = String(inputs.credentials ?? "");
    if (!cred) throw new Error("credentials es requerido");
    const channelId = inputs.channelId ? String(inputs.channelId) : undefined;
    const timeout = Number(inputs.timeout ?? 300);
    const deadline = Date.now() + timeout * 1000;
    const startTime = Date.now();
    let seenId: string | null = null;
    try {
      const { accessToken } = await getValidAccessToken(context.userId, "discord");
      const first = await fetchLatestDiscordMessage(accessToken, channelId);
      seenId = (first?.id as string) ?? null;
      if (first?.timestamp) startTime as unknown;
    } catch {}

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (context.isHalted) throw new Error("Ejecución cancelada");
      try {
        const { accessToken } = await getValidAccessToken(context.userId, "discord");
        const latest = await fetchLatestDiscordMessage(accessToken, channelId);
        if (latest) {
          const ts = new Date((latest.timestamp as string) ?? 0).getTime();
          if (ts > startTime && (latest as { id: string }).id !== seenId) {
            const author = latest.author as Record<string, unknown> | undefined;
            const guildId = latest.guild_id ?? "";
            let messageType = "channel";
            if (!guildId) messageType = "dm";
            return {
              outputs: {
                channelId: latest.channel_id ?? "",
                author: author?.username ?? author?.id ?? "",
                content: latest.content ?? "",
                guildId,
                timestamp: latest.timestamp ?? "",
                messageType,
              },
            };
          }
        }
      } catch {}
    }
    throw new Error(
      `Discord Trigger timeout after ${timeout}s - no se recibió ningún mensaje nuevo`
    );
  }
}
