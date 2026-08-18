import { INodeExecutor, ExecutorResult } from "./registry";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { URL } from "url";

type AuthType = "none" | "bearer" | "basic" | "api_key";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.amazonaws.com",
]);

function isReservedIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const first = parseInt(parts[0], 10);
  const second = parseInt(parts[1], 10);
  return (
    first === 0 ||
    first === 10 ||
    (first === 100 && second >= 64 && second <= 127) ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first >= 224
  );
}

function validateUrl(targetUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS protocols are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("Requests to this host are not allowed");
  }

  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) && isReservedIPv4(hostname)) {
    throw new Error("Requests to private/reserved IP addresses are not allowed");
  }

  try {
    const numericParts = hostname.split(".").map(Number);
    if (numericParts.length === 4 && numericParts.every((p) => p >= 0 && p <= 255)) {
      if (isReservedIPv4(hostname)) {
        throw new Error("Requests to private/reserved IP addresses are not allowed");
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("not allowed")) throw e;
  }
}

export class HttpRequestExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const url = (inputs.url as string) || "";
    if (!url) throw new Error("URL is required");

    validateUrl(url);

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
