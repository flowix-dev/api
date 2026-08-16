import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { getJson } from "./http-helper";

const API_BASE = "https://api.airtable.com/v0";

export class AirtableListExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const token = String(inputs.token ?? "").trim();
    const baseId = String(inputs.baseId ?? "").trim();
    const tableName = String(inputs.tableName ?? "").trim();
    if (!token) {
      throw new Error("token es requerido");
    }
    if (!baseId || !tableName) {
      throw new Error("baseId y tableName son requeridos");
    }

    const limit = Number(inputs.limit ?? 100);
    const query = new URLSearchParams();
    if (Number.isFinite(limit) && limit > 0) {
      query.set("maxRecords", String(Math.trunc(limit)));
    }
    if (inputs.view) {
      query.set("view", String(inputs.view));
    }

    const url = `${API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}?${query.toString()}`;
    const { status, data } = await getJson(url, { Authorization: `Bearer ${token}` });

    const records = (data as { records?: Array<{ fields: Record<string, unknown>; id: string }> })
      .records;
    const rows = (records ?? []).map((record) => ({ id: record.id, ...record.fields }));

    return { outputs: { status, records, rows } };
  }
}
