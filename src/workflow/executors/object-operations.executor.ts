import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const MODES = ["merge", "set"];

export class ObjectOperationsExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const mode = MODES.includes(String(inputs.mode)) ? String(inputs.mode) : "merge";

    let result: Record<string, unknown>;
    if (mode === "set") {
      const base = parseObject(inputs.object);
      const key = String(inputs.key ?? "").trim();
      if (!key) {
        throw new Error("key es requerido para set");
      }
      result = { ...base, [key]: inputs.value };
    } else {
      const object1 = parseObject(inputs.object1);
      const object2 = parseObject(inputs.object2);
      result = { ...object1, ...object2 };
    }

    return { outputs: { ...inputs, result } };
  }
}

function parseObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        /* fall through */
      }
    }
  }
  return {};
}
