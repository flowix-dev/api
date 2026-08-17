import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class RandomNumberExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const min = Number(inputs.min ?? 0);
    const max = Number(inputs.max ?? 100);
    const isInteger = Boolean(inputs.integer);

    const lo = Math.min(min, max);
    const hi = Math.max(min, max);

    if (lo === hi) {
      return { outputs: { result: lo } };
    }

    let result: number;
    if (isInteger) {
      result = Math.floor(Math.random() * (hi - lo + 1)) + lo;
    } else {
      result = Math.random() * (hi - lo) + lo;
      result = Math.round(result * 1_000_000) / 1_000_000;
    }

    return { outputs: { result } };
  }
}
