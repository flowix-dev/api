import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class ArrayLengthExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const raw = inputs.value;
    if (raw === undefined || raw === null) {
      throw new Error("value es requerido");
    }

    const length = Array.isArray(raw)
      ? raw.length
      : typeof raw === "string"
        ? Array.from(raw).length
        : null;
    if (length === null) {
      throw new Error("value debe ser un array o un string");
    }

    return { outputs: { length } };
  }
}
