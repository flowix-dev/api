import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getS3Client } from "./s3";

export const WORKFLOW_FILES_BUCKET = process.env.WORKFLOW_FILES_BUCKET || "flowix-workflow-files";

export async function ensureWorkflowFilesBucket(): Promise<void> {
  try {
    await getS3Client().send(new HeadBucketCommand({ Bucket: WORKFLOW_FILES_BUCKET }));
  } catch {
    await getS3Client().send(new CreateBucketCommand({ Bucket: WORKFLOW_FILES_BUCKET }));
  }
}

export async function putWorkflowFile(
  key: string,
  data: Buffer,
  type: string,
  metadata: Record<string, string> = {}
): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: WORKFLOW_FILES_BUCKET,
      Key: key,
      Body: data,
      ContentType: type,
      Metadata: metadata,
    })
  );
}

export interface WorkflowFile {
  body: Buffer;
  contentType?: string;
  name?: string;
}

export interface WorkflowFileMeta {
  name?: string;
  md5?: string;
}

export async function headWorkflowFile(key: string): Promise<WorkflowFileMeta | null> {
  try {
    const response = await getS3Client().send(
      new HeadObjectCommand({ Bucket: WORKFLOW_FILES_BUCKET, Key: key })
    );
    return {
      name: response.Metadata?.["originalname"],
      md5: response.Metadata?.["md5"],
    };
  } catch (error) {
    const name = (error as { name?: string }).name ?? "";
    if (name === "NotFound" || name === "NoSuchKey") {
      return null;
    }
    throw error;
  }
}

export async function getWorkflowFileByKey(key: string): Promise<WorkflowFile> {
  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: WORKFLOW_FILES_BUCKET, Key: key })
  );
  const body = Buffer.from(await response.Body!.transformToByteArray());
  return {
    body,
    contentType: response.ContentType,
    name: response.Metadata?.["originalname"],
  };
}

export async function deleteWorkflowFile(key: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: WORKFLOW_FILES_BUCKET, Key: key }));
}
