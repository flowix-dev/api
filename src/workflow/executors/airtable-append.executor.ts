import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { postJson } from "./http-helper";

const API_BASE = "https://api.airtable.com/v0";

export class AirtableAppendExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const token = String(inputs.token ?? "").trim();
    const baseId = String(inputs.baseId ?? "").trim();
    const tableName = String(inputs.tableName ?? "").trim();
    const fields = parseFields(inputs.fields);
    if (!token) {
      throw new Error("token es requerido");
    }
    if (!baseId || !tableName) {
      throw new Error("baseId y tableName son requeridos");
    }
    if (Object.keys(fields).length === 0) {
      throw new Error("fields es requerido");
    }

    const url = `${API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
    const { status, data } = await postJson(
      url,
      { records: [{ fields }] },
      { Authorization: `Bearer ${token}` }
    );

    return { outputs: { status, data } };
  }
}

function parseFields(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* fall through */
    }
  }
  return {};
}
