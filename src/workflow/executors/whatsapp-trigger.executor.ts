import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";

export class WhatsAppTriggerExecutor implements INodeExecutor {
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

    const entry = (data.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown> | undefined;
    const messages = value?.messages as Array<Record<string, unknown>> | undefined;
    const message = messages?.[0];
    const contacts = value?.contacts as Array<Record<string, unknown>> | undefined;
    const contact = contacts?.[0];
    const profile = contact?.profile as Record<string, unknown> | undefined;
    const textBody = (message?.text as Record<string, unknown>)?.body as string | undefined;

    return {
      outputs: {
        from: (contact?.wa_id as string) ?? (message?.from as string) ?? "",
        name: (profile?.name as string) ?? "",
        text: textBody ?? "",
        messageId: (message?.id as string) ?? "",
        timestamp: (message?.timestamp as string) ?? "",
      },
    };
  }
}
