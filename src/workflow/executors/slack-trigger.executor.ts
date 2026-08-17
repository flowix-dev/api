import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";

export class SlackTriggerExecutor implements INodeExecutor {
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

    const channelType = String(data.channel_type ?? "");
    let messageType = "channel";
    if (channelType === "D") {
      messageType = "dm";
    } else if (channelType === "G") {
      messageType = "group";
    }

    return {
      outputs: {
        channel: data.channel_name ?? data.channel_id ?? "",
        user: data.user_name ?? data.user_id ?? "",
        text: data.text ?? "",
        team: data.team_domain ?? data.team_id ?? "",
        timestamp: data.ts ?? "",
        messageType,
      },
    };
  }
}
