import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { postJson } from "./http-helper";

const API_BASE = "https://api.notion.com/v1";

export class NotionCreatePageExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const token = String(inputs.token ?? "").trim();
    const databaseId = String(inputs.databaseId ?? "").trim();
    const properties = parseObject(inputs.properties);
    if (!token) {
      throw new Error("token es requerido");
    }
    if (!databaseId) {
      throw new Error("databaseId es requerido");
    }

    const body: Record<string, unknown> = {
      parent: { database_id: databaseId },
      properties,
    };
    if (inputs.children) {
      const children = parseChildren(inputs.children);
      if (children.length > 0) {
        body.children = children;
      }
    }

    const { status, data } = await postJson(`${API_BASE}/pages`, body, {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
    });

    const page = data as { id?: string; url?: string } | undefined;
    return {
      outputs: { status, id: page?.id, url: page?.url, page: data },
    };
  }
}

function parseObject(raw: unknown): Record<string, unknown> {
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

function parseChildren(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
