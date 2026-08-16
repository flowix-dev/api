import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";
import { listDriveFiles } from "./google-helper";

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DOCS_API = "https://docs.googleapis.com/v1/documents";
const MIME_TYPE = "application/vnd.google-apps.document";

const OPERATIONS = ["create", "list", "read", "update"];

export class GoogleDocsExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const operation = OPERATIONS.includes(String(inputs.operation))
      ? String(inputs.operation)
      : "create";
    if (!context?.userId) {
      throw new Error("No se pudo resolver el usuario");
    }
    const { accessToken } = await getValidAccessToken(context.userId, "google");

    switch (operation) {
      case "list": {
        const files = await listDriveFiles(accessToken, MIME_TYPE);
        return { outputs: { files } };
      }
      case "read": {
        const documentId = String(inputs.documentId ?? "").trim();
        if (!documentId) {
          throw new Error("documentId es requerido");
        }
        const response = await fetch(`${DOCS_API}/${documentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = (await response.json()) as {
          title?: string;
          error?: { message?: string };
        };
        if (!response.ok) {
          throw new Error(data.error?.message || "Google Docs read failed");
        }
        return {
          outputs: { title: data.title ?? "", text: extractPlainText(data), document: data },
        };
      }
      case "update": {
        const documentId = String(inputs.documentId ?? "").trim();
        const find = String(inputs.find ?? "");
        const replacement = String(inputs.replacement ?? "");
        if (!documentId) {
          throw new Error("documentId es requerido");
        }
        if (!find) {
          throw new Error("find es requerido para update");
        }
        const response = await fetch(`${DOCS_API}/${documentId}:batchUpdate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                replaceAllText: {
                  containsText: { text: find, matchCase: false },
                  replaceText: replacement,
                },
              },
            ],
          }),
        });
        const data = (await response.json()) as {
          replies?: Array<{ replaceAllText?: { occurrencesChanged?: number } }>;
          error?: { message?: string };
        };
        if (!response.ok) {
          throw new Error(data.error?.message || "Google Docs update failed");
        }
        const occurrencesReplaced = data.replies?.[0]?.replaceAllText?.occurrencesChanged ?? 0;
        return { outputs: { documentId, occurrencesReplaced } };
      }
      case "create":
      default: {
        const title = String(inputs.title ?? "").trim();
        const content = String(inputs.content ?? "");
        if (!title) {
          throw new Error("title es requerido");
        }

        const createResponse = await fetch(DRIVE_API, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: title, mimeType: MIME_TYPE }),
        });
        const createData = (await createResponse.json()) as {
          id?: string;
          error?: { message?: string };
        };
        if (!createResponse.ok) {
          throw new Error(createData.error?.message || "Google Docs create failed");
        }
        const documentId = createData.id!;

        if (content) {
          const insertResponse = await fetch(`${DOCS_API}/${documentId}:batchUpdate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: [{ insertText: { location: { index: 0 }, text: content } }],
            }),
          });
          const insertData = (await insertResponse.json()) as {
            error?: { message?: string };
          };
          if (!insertResponse.ok) {
            throw new Error(insertData.error?.message || "Google Docs insert failed");
          }
        }

        return {
          outputs: {
            documentId,
            url: `https://docs.google.com/document/d/${documentId}/edit`,
          },
        };
      }
    }
  }
}

function extractPlainText(data: Record<string, unknown>): string {
  const content =
    (data.body as { content?: Array<Record<string, unknown>> } | undefined)?.content ?? [];
  const paragraphs = content.map((element) => {
    const paragraph = element.paragraph as
      { elements?: Array<Record<string, unknown>> } | undefined;
    const elements = paragraph?.elements ?? [];
    return elements
      .map((item) => {
        const textRun = item.textRun as { content?: string } | undefined;
        return textRun?.content ?? "";
      })
      .join("");
  });
  return paragraphs.filter((paragraph) => paragraph !== "").join("\n");
}
