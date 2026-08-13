import { createHash } from "node:crypto";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import {
  ensureWorkflowFilesBucket,
  headWorkflowFile,
  putWorkflowFile,
} from "../../utils/fileStorage";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

export class FileUploadExecutor implements INodeExecutor {
  async execute(
    node: IWorkflowNode,
    _inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    if (!context?.uploadedFile) {
      throw new Error("No se proporcionó un archivo. Subí un archivo al ejecutar el workflow.");
    }

    await ensureWorkflowFilesBucket();

    const file = context.uploadedFile;
    const safeName = file.originalname.replace(/[^\w.\- ]/g, "_");
    const key = `workflow-files/${context.workflowId}/${node.id}`;
    const url = `${API_BASE_URL}/api/workflows/files/${key}`;
    const hash = createHash("md5").update(file.buffer).digest("hex");

    context.uploadedFiles.set(node.id, file);

    const existing = await headWorkflowFile(key);
    if (existing?.md5 === hash) {
      return {
        outputs: {
          url,
          key,
          name: existing.name ?? safeName,
          size: file.size,
          type: file.mimetype,
        },
      };
    }

    await putWorkflowFile(key, file.buffer, file.mimetype, {
      originalname: safeName,
      md5: hash,
    });

    return {
      outputs: {
        url,
        key,
        name: safeName,
        size: file.size,
        type: file.mimetype,
      },
    };
  }
}
