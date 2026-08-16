import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class SwitchExecutor implements INodeExecutor {
  readonly batchMode = "never" as const;

  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const cases = parseCases(inputs.cases);
    const value = inputs.value;
    const matchedIndex = findMatchIndex(value, cases);

    const outputs: Record<string, unknown> = {};
    const skipEdges: string[] = [];

    for (let i = 0; i < cases.length; i++) {
      const key = `case${i + 1}`;
      outputs[key] = null;
      skipEdges.push(key);
    }
    outputs.default = null;
    skipEdges.push("default");

    const activeKey = matchedIndex >= 0 ? `case${matchedIndex + 1}` : "default";
    outputs[activeKey] = value;
    skipEdges.splice(skipEdges.indexOf(activeKey), 1);

    return { outputs, skipEdges };
  }
}

function parseCases(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw !== "string") {
    return [];
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      /* fall through to CSV parsing */
    }
  }
  return parseCaseList(trimmed);
}

function parseCaseList(text: string): string[] {
  const values: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ",") {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);

  return values.map((item) => item.trim()).filter((item) => item !== "");
}

function findMatchIndex(value: unknown, cases: unknown[]): number {
  if (!Array.isArray(value)) {
    return cases.findIndex((item) => item == value);
  }
  return cases.findIndex((item) => value.some((element) => item == element));
}
