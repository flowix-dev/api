import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export class NotionUpdatePageExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const token = String(inputs.token ?? "").trim();
    const pageId = String(inputs.pageId ?? "").trim();
    const propertiesRaw = String(inputs.properties ?? "{}").trim();

    if (!token || !pageId) {
      throw new Error("token y pageId son requeridos");
    }

    let properties: Record<string, unknown>;
    try {
      properties = JSON.parse(propertiesRaw);
    } catch {
      throw new Error("properties debe ser un JSON válido");
    }

    const response = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Notion error: ${(error as { message?: string })?.message ?? response.status}`
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    return {
      outputs: {
        id: data.id,
        url: data.url,
        status: response.status,
        lastEdited: data.last_edited_time,
      },
    };
  }
}
