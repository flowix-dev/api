import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class FirebaseQueryExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const projectId = String(inputs.projectId ?? "").trim();
    const collection = String(inputs.collection ?? "").trim();
    const operation = String(inputs.operation ?? "get").trim();
    const documentId = String(inputs.documentId ?? "").trim();
    const data = String(inputs.data ?? "").trim();
    const filterField = String(inputs.filterField ?? "").trim();
    const filterValue = String(inputs.filterValue ?? "").trim();
    const limit = Number(inputs.limit ?? 100);
    const serviceAccountKey = String(inputs.serviceAccountKey ?? "").trim();

    if (!projectId || !collection || !serviceAccountKey) {
      throw new Error("projectId, collection y serviceAccountKey son requeridos");
    }

    let credentials: { client_email: string; private_key: string };
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch {
      throw new Error("serviceAccountKey debe ser un JSON válido con client_email y private_key");
    }

    const accessToken = await this.getAccessToken(credentials);

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    let url: string;
    const init: RequestInit = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    switch (operation) {
      case "get": {
        if (!documentId) throw new Error("documentId es requerido para get");
        url = `${baseUrl}/${collection}/${documentId}`;
        break;
      }
      case "list": {
        url = `${baseUrl}/${collection}`;
        const params = new URLSearchParams();
        if (filterField && filterValue) {
          params.append("filter", `${filterField} = "${filterValue}"`);
        }
        if (limit) params.append("pageSize", String(limit));
        const qs = params.toString();
        if (qs) url += `?${qs}`;
        break;
      }
      case "create": {
        url = `${baseUrl}/${collection}`;
        init.method = "POST";
        const fields = this.parseDataToFields(data);
        init.body = JSON.stringify({ fields });
        break;
      }
      case "update": {
        if (!documentId) throw new Error("documentId es requerido para update");
        url = `${baseUrl}/${collection}/${documentId}?updateMask.fieldPaths=${Object.keys(this.parseDataToFields(data)).join(",")}`;
        init.method = "PATCH";
        const updateFields = this.parseDataToFields(data);
        init.body = JSON.stringify({ fields: updateFields });
        break;
      }
      case "delete": {
        if (!documentId) throw new Error("documentId es requerido para delete");
        url = `${baseUrl}/${collection}/${documentId}`;
        init.method = "DELETE";
        break;
      }
      default:
        throw new Error(`Operación no soportada: ${operation}`);
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Firebase error: ${(error as { error?: { message?: string } })?.error?.message ?? response.status}`
      );
    }

    if (operation === "delete") {
      return { outputs: { success: true, status: 204 } };
    }

    const result = (await response.json()) as Record<string, unknown>;

    return {
      outputs: {
        data: result as unknown,
        name: (result.name as string) ?? "",
        status: response.status,
      },
    };
  }

  private parseDataToFields(
    dataStr: string
  ): Record<
    string,
    { stringValue?: string; integerValue?: string; booleanValue?: boolean; mapValue?: unknown }
  > {
    try {
      const parsed = JSON.parse(dataStr);
      const fields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
          fields[key] = { stringValue: value };
        } else if (typeof value === "number") {
          fields[key] = { integerValue: String(value) };
        } else if (typeof value === "boolean") {
          fields[key] = { booleanValue: value };
        } else if (Array.isArray(value)) {
          fields[key] = { arrayValue: { values: value.map((v) => ({ stringValue: String(v) })) } };
        } else if (typeof value === "object" && value !== null) {
          fields[key] = { mapValue: { fields: this.parseDataToFields(JSON.stringify(value)) } };
        }
      }
      return fields as Record<
        string,
        { stringValue?: string; integerValue?: string; booleanValue?: boolean; mapValue?: unknown }
      >;
    } catch {
      throw new Error("data debe ser un JSON válido");
    }
  }

  private async getAccessToken(credentials: {
    client_email: string;
    private_key: string;
  }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const encoder = new TextEncoder();
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);

    const keyData = credentials.private_key
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");

    const binaryString = atob(keyData);
    const keyBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      keyBytes[i] = binaryString.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
      "pkcs8",
      keyBytes,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new Error(`Token error: ${tokenData.error ?? "unknown"}`);
    }

    return tokenData.access_token;
  }
}
