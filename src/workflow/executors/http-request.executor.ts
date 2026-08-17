import { INodeExecutor, ExecutorResult } from "./registry";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";

type AuthType = "none" | "bearer" | "basic" | "api_key";

export class HttpRequestExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const url = (inputs.url as string) || "";
    if (!url) throw new Error("URL is required");

    const method = (inputs.method as string) || "GET";
    const headers = { ...((inputs.headers as Record<string, string>) || {}) };
    const body = inputs.body as string | undefined;
    const authType = (inputs.authType as AuthType) || "none";

    switch (authType) {
      case "bearer": {
        const token = String(inputs.authToken ?? "").trim();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        break;
      }
      case "basic": {
        const username = String(inputs.authUsername ?? "").trim();
        const password = String(inputs.authPassword ?? "").trim();
        if (username || password) {
          headers["Authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
        }
        break;
      }
      case "api_key": {
        const apiKey = String(inputs.authApiKey ?? "").trim();
        const keyName = String(inputs.authKeyName ?? "X-API-Key").trim();
        const keyLocation = String(inputs.authKeyLocation ?? "header").trim();
        if (apiKey) {
          if (keyLocation === "query") {
            const separator = url.includes("?") ? "&" : "?";
            const fullUrl = `${url}${separator}${encodeURIComponent(keyName)}=${encodeURIComponent(apiKey)}`;
            return this.doRequest(method, fullUrl, headers, body);
          }
          headers[keyName] = apiKey;
        }
        break;
      }
    }

    return this.doRequest(method, url, headers, body);
  }

  private async doRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string
  ): Promise<ExecutorResult> {
    const contentType = headers["Content-Type"] || headers["content-type"];

    const init: RequestInit = {
      method: method.toUpperCase(),
      headers,
    };

    if (body && method.toUpperCase() !== "GET") {
      if (contentType?.includes("json")) {
        init.body = body;
      } else {
        init.body = body;
        if (!contentType) {
          headers["Content-Type"] = "application/json";
        }
      }
    }

    const response = await fetch(url, init);

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
