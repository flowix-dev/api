import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class GetDateTimeExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const timezone = String(inputs.timezone ?? "").trim();
    const now = timezone
      ? new Date(new Date().toLocaleString("en-US", { timeZone: timezone }))
      : new Date();

    return {
      outputs: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
        iso: new Date().toISOString(),
        timestamp: Date.now(),
      },
    };
  }
}
