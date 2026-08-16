import { Pool } from "pg";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class PostgresQueryExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const connectionString = String(inputs.connectionString ?? "").trim();
    const queryText = String(inputs.query ?? "").trim();
    if (!connectionString) {
      throw new Error("connectionString es requerido");
    }
    if (!queryText) {
      throw new Error("query es requerido");
    }
    const params = parseParams(inputs.params);

    const pool = new Pool({ connectionString });
    try {
      const res = await pool.query(queryText, params);
      return {
        outputs: { ...inputs, rows: res.rows, rowCount: res.rowCount, fields: res.fields },
      };
    } finally {
      await pool.end();
    }
  }
}

function parseParams(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
