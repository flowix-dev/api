import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class GetValueExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const object = inputs.object;
    const key = String(inputs.key ?? "");
    if (object === undefined || object === null || typeof object !== "object") {
      throw new Error("object es requerido");
    }
    if (!key) {
      throw new Error("key es requerido");
    }
    const record = object as Record<string, unknown>;
    return { outputs: { value: record[key] } };
  }
}
