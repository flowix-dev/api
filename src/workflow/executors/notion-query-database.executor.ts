import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export class NotionQueryDatabaseExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const token = String(inputs.token ?? "").trim();
    const databaseId = String(inputs.databaseId ?? "").trim();
    const filterProperty = String(inputs.filterProperty ?? "").trim();
    const filterValue = String(inputs.filterValue ?? "").trim();
    const sortProperty = String(inputs.sortProperty ?? "").trim();
    const sortDirection = String(inputs.sortDirection ?? "descending");
    const pageSize = Number(inputs.pageSize ?? 100);

    if (!token || !databaseId) {
      throw new Error("token y databaseId son requeridos");
    }

    const body: Record<string, unknown> = { page_size: pageSize };

    if (filterProperty && filterValue) {
      body.filter = {
        property: filterProperty,
        rich_text: { equals: filterValue },
      };
    }

    if (sortProperty) {
      body.sorts = [
        {
          property: sortProperty,
          direction: sortDirection === "ascending" ? "ascending" : "descending",
        },
      ];
    }

    const response = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Notion error: ${(error as { message?: string })?.message ?? response.status}`
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    const results = (data.results ?? []) as Array<Record<string, unknown>>;

    const pages = results.map((page) => {
      const props = page.properties as Record<string, Record<string, unknown>> | undefined;
      return {
        id: page.id,
        url: page.url,
        properties: this.extractProperties(props),
      };
    });

    return {
      outputs: {
        pages,
        count: pages.length,
        hasMore: data.has_more ?? false,
        nextCursor: data.next_cursor ?? null,
      },
    };
  }

  private extractProperties(
    props: Record<string, Record<string, unknown>> | undefined
  ): Record<string, unknown> {
    if (!props) return {};
    const result: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(props)) {
      switch (prop.type) {
        case "rich_text":
          result[key] =
            (prop.rich_text as Array<{ plain_text?: string }>)
              ?.map((t) => t.plain_text ?? "")
              .join("") ?? "";
          break;
        case "title":
          result[key] =
            (prop.title as Array<{ plain_text?: string }>)
              ?.map((t) => t.plain_text ?? "")
              .join("") ?? "";
          break;
        case "number":
          result[key] = prop.number ?? null;
          break;
        case "select":
          result[key] = (prop.select as { name?: string })?.name ?? null;
          break;
        case "multi_select":
          result[key] =
            (prop.multi_select as Array<{ name?: string }>)?.map((s) => s.name ?? "") ?? [];
          break;
        case "checkbox":
          result[key] = prop.checkbox ?? false;
          break;
        case "date":
          result[key] = (prop.date as { start?: string })?.start ?? null;
          break;
        case "email":
          result[key] = prop.email ?? null;
          break;
        case "url":
          result[key] = prop.url ?? null;
          break;
        default:
          result[key] = null;
          break;
      }
    }
    return result;
  }
}
