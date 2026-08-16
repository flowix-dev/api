import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const OPERATIONS = ["suma", "resta", "multiplicacion", "division", "potencia", "raiz", "modulo"];

export class MathOperationExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const operation = OPERATIONS.includes(String(inputs.operation))
      ? String(inputs.operation)
      : "suma";
    const a = toNumber(inputs.a, "a");
    const b = toNumber(inputs.b, "b");
    const result = compute(a, b, operation);

    return { outputs: { ...inputs, result } };
  }
}

function toNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${label} debe ser un número`);
  }
  return num;
}

function compute(a: number | null, b: number | null, operation: string): number | null {
  if (a === null || b === null) {
    return null;
  }
  switch (operation) {
    case "suma":
      return a + b;
    case "resta":
      return a - b;
    case "multiplicacion":
      return a * b;
    case "division":
      if (b === 0) {
        throw new Error("División por cero");
      }
      return a / b;
    case "potencia":
      return Math.pow(a, b);
    case "raiz":
      if (a === 0) {
        throw new Error("La raíz debe tener índice distinto de cero");
      }
      return Math.pow(b, 1 / a);
    case "modulo":
      if (b === 0) {
        throw new Error("Módulo por cero");
      }
      return a % b;
    default:
      return a + b;
  }
}
