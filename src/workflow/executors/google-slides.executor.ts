import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getValidAccessToken } from "../../services/credential.service";
import { listDriveFiles } from "./google-helper";

const API = "https://slides.googleapis.com/v1/presentations";
const MIME_TYPE = "application/vnd.google-apps.presentation";

const OPERATIONS = ["create", "list", "read", "update"];

export class GoogleSlidesExecutor implements INodeExecutor {
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
        const presentationId = String(inputs.presentationId ?? "").trim();
        if (!presentationId) {
          throw new Error("presentationId es requerido");
        }
        const response = await fetch(`${API}/${presentationId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = (await response.json()) as {
          title?: string;
          slides?: Array<{ objectId?: string; slideProperties?: { title?: string } }>;
          error?: { message?: string };
        };
        if (!response.ok) {
          throw new Error(data.error?.message || "Google Slides read failed");
        }
        const slides = (data.slides ?? []).map((slide) => ({
          id: slide.objectId ?? "",
          title: slide.slideProperties?.title ?? "",
        }));
        return { outputs: { title: data.title ?? "", slideCount: slides.length, slides } };
      }
      case "update": {
        const presentationId = String(inputs.presentationId ?? "").trim();
        const title = String(inputs.title ?? "");
        if (!presentationId) {
          throw new Error("presentationId es requerido");
        }
        const response = await fetch(`${API}/${presentationId}:batchUpdate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                createSlide: {
                  slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
                },
              },
            ],
          }),
        });
        const data = (await response.json()) as {
          replies?: Array<{ createSlide?: { objectId?: string } }>;
          error?: { message?: string };
        };
        if (!response.ok) {
          throw new Error(data.error?.message || "Google Slides update failed");
        }
        const slideId = data.replies?.[0]?.createSlide?.objectId ?? "";

        if (title && slideId) {
          const insertResponse = await fetch(`${API}/${presentationId}:batchUpdate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: [{ insertText: { objectId: slideId, insertionIndex: 0, text: title } }],
            }),
          });
          const insertData = (await insertResponse.json()) as {
            error?: { message?: string };
          };
          if (!insertResponse.ok) {
            throw new Error(insertData.error?.message || "Google Slides insert failed");
          }
        }

        return { outputs: { presentationId, slideId } };
      }
      case "create":
      default: {
        const title = String(inputs.title ?? "").trim();
        if (!title) {
          throw new Error("title es requerido");
        }
        const response = await fetch(API, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        const data = (await response.json()) as {
          presentationId?: string;
          error?: { message?: string };
        };
        if (!response.ok) {
          throw new Error(data.error?.message || "Google Slides create failed");
        }

        return {
          outputs: {
            presentationId: data.presentationId ?? "",
            url: data.presentationId
              ? `https://docs.google.com/presentation/d/${data.presentationId}/edit`
              : "",
          },
        };
      }
    }
  }
}
