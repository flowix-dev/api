import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";
import { listDriveFiles } from "./google-helper";

const API = "https://sheets.googleapis.com/v4/spreadsheets";
const MIME_TYPE = "application/vnd.google-apps.spreadsheet";

const OPERATIONS = ["append", "read", "list", "update"];

export class GoogleSheetsExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const operation = OPERATIONS.includes(String(inputs.operation))
      ? String(inputs.operation)
      : "append";
    if (!context?.userId) {
      throw new Error("No se pudo resolver el usuario");
    }
    const { accessToken } = await getValidAccessToken(context.userId, "google");

    if (operation === "list") {
      const files = await listDriveFiles(accessToken, MIME_TYPE);
      return { outputs: { files } };
    }

    const spreadsheetId = String(inputs.spreadsheetId ?? "").trim();
    const sheetName = String(inputs.sheetName ?? "Sheet1").trim() || "Sheet1";
    if (!spreadsheetId) {
      throw new Error("spreadsheetId es requerido");
    }

    if (operation === "read") {
      const range = String(inputs.range ?? "A1").trim() || "A1";
      const url = `${API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}!${encodeURIComponent(range)}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await response.json()) as {
        values?: unknown[];
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(data.error?.message || "Google Sheets read failed");
      }
      return { outputs: { ...inputs, values: data.values ?? [], result: data } };
    }

    const values = parseMatrix(inputs.values);

    if (operation === "update") {
      const range = String(inputs.range ?? "A1").trim() || "A1";
      const url = `${API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}!${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(data.error?.message || "Google Sheets update failed");
      }
      return { outputs: { ...inputs, result: data } };
    }

    const url = `${API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    const data = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(data.error?.message || "Google Sheets append failed");
    }

    return { outputs: { ...inputs, result: data } };
  }
}

function parseMatrix(raw: unknown): unknown[][] {
  const matrix = Array.isArray(raw) ? raw : typeof raw === "string" ? tryParse(raw) : [];
  return matrix.filter((row) => Array.isArray(row)) as unknown[][];
}

function tryParse(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
