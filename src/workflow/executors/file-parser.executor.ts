import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { getWorkflowFileByKey } from "../../utils/fileStorage";
import { parseFileBuffer } from "../../utils/fileParser";

const URL_MARKER = "/api/workflows/files/";

function resolveFileKey(urlOrKey: string): string {
  const index = urlOrKey.indexOf(URL_MARKER);
  if (index !== -1) {
    return decodeURIComponent(urlOrKey.slice(index + URL_MARKER.length));
  }
  return urlOrKey;
}

function nodeIdFromKey(key: string): number | null {
  const segments = key.split("/");
  if (segments.length === 3 && segments[0] === "workflow-files") {
    const parsed = Number(segments[2]);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
}

export class FileParserExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const urlOrKey = (inputs.url as string) || "";
    if (!urlOrKey) {
      throw new Error("url es requerido (conectalo al output url de File Upload)");
    }

    const key = resolveFileKey(urlOrKey);
    const nodeId = nodeIdFromKey(key);
    const inMemory = nodeId !== null ? context?.uploadedFiles.get(nodeId) : undefined;

    const result = inMemory
      ? await parseFileBuffer(
          inMemory.buffer,
          inMemory.originalname,
          inMemory.mimetype,
          context?.puterToken ?? null
        )
      : await (async () => {
          const file = await getWorkflowFileByKey(key);
          return parseFileBuffer(
            file.body,
            file.name ?? "",
            file.contentType ?? "",
            context?.puterToken ?? null
          );
        })();

    const outputs: Record<string, unknown> = {
      text: result.text,
      format: result.format,
    };
    if (result.rows !== undefined) {
      outputs.rows = result.rows;
    }

    return { outputs };
  }
}
