import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class ArrayGetExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const raw = inputs.array;
    if (raw === undefined || raw === null) {
      throw new Error("array es requerido");
    }

    let array: unknown[];
    if (Array.isArray(raw)) {
      array = raw;
    } else if (typeof raw === "string") {
      array = Array.from(raw);
    } else {
      throw new Error("array debe ser un array o un string");
    }

    const index = typeof inputs.index === "number" ? inputs.index : Number(inputs.index);
    if (!Number.isFinite(index)) {
      throw new Error("index debe ser un número");
    }

    const normalized = Math.trunc(index);
    const value = normalized >= 0 && normalized < array.length ? array[normalized] : null;

    return { outputs: { value } };
  }
}
