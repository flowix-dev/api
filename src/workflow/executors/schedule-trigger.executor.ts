import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class ScheduleTriggerExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const now = new Date();
    return {
      outputs: {
        ...inputs,
        timestamp: now.toISOString(),
        now: now.getTime(),
      },
    };
  }
}
