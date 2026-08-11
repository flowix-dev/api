import { PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { INodeExecutor, ExecutorResult } from "./registry";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { getS3Client } from "../../utils/s3";

export class S3StorageExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const action = (inputs.action as string) || "list";
    const bucket = (inputs.bucket as string) || "";
    const key = (inputs.key as string) || "";
    const content = inputs.content as string | undefined;

    if (!bucket) throw new Error("bucket is required");

    const client = getS3Client();

    switch (action) {
      case "list": {
        const cmd = new ListObjectsV2Command({ Bucket: bucket });
        const result = await client.send(cmd);
        return {
          outputs: {
            keys: (result.Contents || []).map((o) => o.Key),
            count: result.Contents?.length || 0,
          },
        };
      }

      case "get": {
        if (!key) throw new Error("key is required for get action");
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
        const result = await client.send(cmd);
        const body = await result.Body?.transformToString();
        return {
          outputs: {
            content: body || "",
            contentType: result.ContentType,
            contentLength: result.ContentLength,
            etag: result.ETag,
          },
        };
      }

      case "put": {
        if (!key) throw new Error("key is required for put action");
        const cmd = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: content || "",
        });
        const result = await client.send(cmd);
        return {
          outputs: {
            etag: result.ETag,
            versionId: result.VersionId,
          },
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
