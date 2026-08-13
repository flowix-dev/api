import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class ParseExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const text = String(inputs.text ?? "").trim();
    if (!text) {
      throw new Error("text es requerido");
    }
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      value = text;
    }
    return { outputs: { value } };
  }
}
