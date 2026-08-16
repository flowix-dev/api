import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const OPERATIONS = ["push", "join", "filter", "map", "concat", "slice"];

export class ArrayOperationsExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const operation = OPERATIONS.includes(String(inputs.operation))
      ? String(inputs.operation)
      : "push";
    const raw = inputs.array;
    if (raw === undefined || raw === null) {
      throw new Error("array es requerido");
    }
    const array = Array.isArray(raw) ? raw : null;
    if (array === null) {
      throw new Error("array debe ser un array o un string");
    }

    let result: unknown;
    switch (operation) {
      case "join": {
        const separator = String(inputs.separator ?? "");
        result = array.map((item) => String(item)).join(separator);
        break;
      }
      case "push":
        result = [...array, inputs.value];
        break;
      case "concat": {
        const other = inputs.value;
        result = Array.isArray(other) ? [...array, ...other] : [...array, other];
        break;
      }
      case "slice": {
        const start = Number(inputs.start ?? 0);
        const end =
          inputs.end === undefined || inputs.end === null || inputs.end === ""
            ? undefined
            : Number(inputs.end);
        if (!Number.isFinite(start) || (end !== undefined && !Number.isFinite(end))) {
          throw new Error("start y end deben ser números");
        }
        result = array.slice(start, end);
        break;
      }
      case "filter": {
        const expression = String(inputs.expression ?? "").trim();
        if (!expression) {
          throw new Error("expression es requerido para filter");
        }
        result = array.filter((item, index) => Boolean(evaluate(expression, item, index, array)));
        break;
      }
      case "map": {
        const expression = String(inputs.expression ?? "").trim();
        if (!expression) {
          throw new Error("expression es requerido para map");
        }
        result = array.map((item, index) => evaluate(expression, item, index, array));
        break;
      }
      default:
        result = [...array, inputs.value];
    }

    return { outputs: { ...inputs, result } };
  }
}

function evaluate(expression: string, item: unknown, index: number, array: unknown[]): unknown {
  try {
    const fn = new Function("item", "index", "array", `return (${expression});`);
    return fn(item, index, array);
  } catch (error) {
    const message = error instanceof Error ? error.message : "expresión inválida";
    const wrapped = new Error(`Expresión inválida: ${message}`);
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}
