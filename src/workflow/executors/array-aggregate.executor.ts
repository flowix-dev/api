import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const OPERATIONS = ["sum", "avg", "max", "min"];

export class ArrayAggregateExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const raw = inputs.array;
    if (raw === undefined || raw === null) {
      throw new Error("array es requerido");
    }

    const items = Array.isArray(raw) ? raw : typeof raw === "string" ? Array.from(raw) : null;
    if (items === null) {
      throw new Error("array debe ser un array o un string");
    }
    if (items.length === 0) {
      throw new Error("array está vacío");
    }

    const numbers = items.map((item) => {
      const num = typeof item === "number" ? item : Number(item);
      if (!Number.isFinite(num)) {
        throw new Error("array debe contener solo números");
      }
      return num;
    });

    const operation = OPERATIONS.includes(String(inputs.operation))
      ? String(inputs.operation)
      : "sum";

    let result: number;
    switch (operation) {
      case "avg":
        result = numbers.reduce((acc, num) => acc + num, 0) / numbers.length;
        break;
      case "max":
        result = Math.max(...numbers);
        break;
      case "min":
        result = Math.min(...numbers);
        break;
      default:
        result = numbers.reduce((acc, num) => acc + num, 0);
    }

    return { outputs: { ...inputs, result } };
  }
}
