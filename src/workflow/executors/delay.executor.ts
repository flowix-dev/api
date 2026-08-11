import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class DelayExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const delayMs = typeof inputs.delay === "number" ? inputs.delay : 1000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return { outputs: { ...inputs, delayed: true, delayMs } };
  }
}
