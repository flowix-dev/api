import { INodeExecutor, ExecutorResult } from "./registry";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";

export class HttpRequestExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const url = (inputs.url as string) || "";
    if (!url) throw new Error("URL is required");

    const method = (inputs.method as string) || "GET";
    const headers = (inputs.headers as Record<string, string>) || {};
    const body = inputs.body as string | undefined;

    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }

    return {
      outputs: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsed,
      },
    };
  }
}
