import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const OPERATIONS = ["split", "replace", "slice", "upper", "lower", "trim"];

export class TextOperationsExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const operation = OPERATIONS.includes(String(inputs.operation))
      ? String(inputs.operation)
      : "trim";
    if (inputs.text === undefined || inputs.text === null) {
      throw new Error("text es requerido");
    }
    const text = String(inputs.text);

    let result: unknown;
    switch (operation) {
      case "split": {
        const separator =
          inputs.separator === undefined || inputs.separator === null
            ? ","
            : String(inputs.separator);
        result = text.split(separator);
        break;
      }
      case "replace": {
        const search = String(inputs.search ?? "");
        if (!search) {
          throw new Error("search es requerido para replace");
        }
        const replacement = String(inputs.replacement ?? "");
        result = text.split(search).join(replacement);
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
        result = text.slice(start, end);
        break;
      }
      case "upper":
        result = text.toUpperCase();
        break;
      case "lower":
        result = text.toLowerCase();
        break;
      default:
        result = text.trim();
    }

    return { outputs: { ...inputs, result } };
  }
}
