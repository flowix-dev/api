import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class SupabaseQueryExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const supabaseUrl = String(inputs.supabaseUrl ?? "").trim();
    const apiKey = String(inputs.apiKey ?? "").trim();
    const table = String(inputs.table ?? "").trim();
    const operation = String(inputs.operation ?? "select").trim();
    const filter = String(inputs.filter ?? "").trim();
    const data = String(inputs.data ?? "").trim();
    const limit = Number(inputs.limit ?? 100);

    if (!supabaseUrl || !apiKey || !table) {
      throw new Error("supabaseUrl, apiKey y table son requeridos");
    }

    const baseUrl = supabaseUrl.replace(/\/$/, "");
    const headers = {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    let url = `${baseUrl}/rest/v1/${table}`;
    const init: RequestInit = { headers };

    switch (operation) {
      case "select": {
        const params = new URLSearchParams();
        if (filter) params.append("select", filter);
        params.append("limit", String(limit));
        const qs = params.toString();
        if (qs) url += `?${qs}`;
        break;
      }
      case "insert": {
        init.method = "POST";
        init.body = data;
        break;
      }
      case "update": {
        init.method = "PATCH";
        init.body = data;
        if (filter) url += `?${filter}`;
        break;
      }
      case "delete": {
        init.method = "DELETE";
        if (filter) url += `?${filter}`;
        break;
      }
      case "upsert": {
        init.method = "POST";
        init.body = data;
        init.headers = { ...headers, Prefer: "return=representation,resolution=merge-duplicates" };
        break;
      }
      default:
        throw new Error(`Operación no soportada: ${operation}`);
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Supabase error: ${(error as { message?: string; hint?: string })?.message ?? response.status}`
      );
    }

    const result = await response.json();

    return {
      outputs: {
        data: result,
        count: Array.isArray(result) ? result.length : 1,
        status: response.status,
      },
    };
  }
}
