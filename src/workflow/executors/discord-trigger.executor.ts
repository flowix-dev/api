import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";

export class DiscordTriggerExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    _inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const raw = context?.triggerData;
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

    return {
      outputs: {
        channelId: data.channel_id ?? "",
        author: author?.username ?? author?.id ?? "",
        content: data.content ?? "",
        guildId: data.guild_id ?? "",
        timestamp: data.timestamp ?? "",
      },
    };
  }
}
