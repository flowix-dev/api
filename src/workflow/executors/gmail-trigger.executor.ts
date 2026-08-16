import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";

export class GmailTriggerExecutor implements INodeExecutor {
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
}
