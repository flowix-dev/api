import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class StringifyExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const value = inputs.value;
    if (value === undefined) {
      throw new Error("value es requerido");
    }
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return { outputs: { text } };
  }
}
