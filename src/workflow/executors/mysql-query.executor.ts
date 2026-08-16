import mysql from "mysql2/promise";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

type SqlValue =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | Buffer
  | SqlValue[]
  | { [key: string]: SqlValue };

export class MysqlQueryExecutor implements INodeExecutor {
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

    const connection = await mysql.createConnection(connectionString);
    try {
      const [rows] = await connection.execute(queryText, params);
      return { outputs: { ...inputs, result: rows } };
    } finally {
      await connection.end();
    }
  }
}

function parseParams(raw: unknown): SqlValue[] {
  const array = Array.isArray(raw) ? raw : typeof raw === "string" ? tryParseArray(raw) : [];
  return array as SqlValue[];
}

function tryParseArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
