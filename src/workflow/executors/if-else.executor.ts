import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const OPERATORS = ["=", ">", "<", ">=", "<="];

export class IfElseExecutor implements INodeExecutor {
  readonly batchMode = "never" as const;

  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const operation = OPERATORS.includes(String(inputs.operation)) ? String(inputs.operation) : "=";
    const pass = compareOperands(inputs.value1, inputs.value2, operation);

    return {
      outputs: pass ? { true: inputs.value1, false: null } : { true: null, false: inputs.value1 },
      skipEdges: pass ? ["false"] : ["true"],
    };
  }
}

function compareOperands(a: unknown, b: unknown, operation: string): boolean {
  const arrayA = Array.isArray(a);
  const arrayB = Array.isArray(b);

  if (!arrayA && !arrayB) {
    return compareValues(a, b, operation);
  }

  const length = Math.max(arrayA ? a.length : 1, arrayB ? b.length : 1);
  if (length === 0) {
    return false;
  }

  for (let i = 0; i < length; i++) {
    const valueA = arrayA ? a[i] : a;
    const valueB = arrayB ? b[i] : b;
    if (!compareValues(valueA, valueB, operation)) {
      return false;
    }
  }
  return true;
}

function compareValues(a: unknown, b: unknown, operation: string): boolean {
  switch (operation) {
    case "=":
      return a == b;
    case ">":
      return (a as number) > (b as number);
    case "<":
      return (a as number) < (b as number);
    case ">=":
      return (a as number) >= (b as number);
    case "<=":
      return (a as number) <= (b as number);
    default:
      return false;
  }
}
