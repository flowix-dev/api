import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class SumExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const a = typeof inputs.a === "number" ? inputs.a : 0;
    const b = typeof inputs.b === "number" ? inputs.b : 0;
    const result = a + b;

    return { outputs: { ...inputs, result } };
  }
}
