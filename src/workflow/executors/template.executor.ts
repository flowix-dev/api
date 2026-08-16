import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class TemplateExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const template = String(inputs.template ?? "");
    if (!template.trim()) {
      throw new Error("template es requerido");
    }
    const values = parseValues(inputs.values);

    const text = template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawPath: string) => {
      const value = resolvePath(values, rawPath.trim());
      if (value === undefined || value === null) {
        return "";
      }
      return typeof value === "string" ? value : JSON.stringify(value);
    });

    return { outputs: { ...inputs, text } };
  }
}

function parseValues(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return {};
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* fall through */
    }
  }
  return {};
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) {
      return undefined;
    }
    if (typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
