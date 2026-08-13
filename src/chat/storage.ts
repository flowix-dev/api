import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getS3Client } from "../utils/s3";

export const CHAT_FILES_BUCKET = process.env.CHAT_FILES_BUCKET || "flowix-chat-files";

export async function ensureChatFilesBucket(): Promise<void> {
  try {
    await getS3Client().send(new HeadBucketCommand({ Bucket: CHAT_FILES_BUCKET }));
  } catch {
    await getS3Client().send(new CreateBucketCommand({ Bucket: CHAT_FILES_BUCKET }));
  }
}

export async function putChatFile(key: string, data: Buffer, type: string): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: CHAT_FILES_BUCKET,
      Key: key,
      Body: data,
      ContentType: type,
    })
  );
}

export async function deleteChatFile(key: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: CHAT_FILES_BUCKET, Key: key }));
}

export async function getChatFileText(key: string): Promise<string> {
  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: CHAT_FILES_BUCKET, Key: key })
  );
  const body = response.Body?.transformToString();
  return body ?? "";
}

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "xml",
  "html",
  "css",
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "rb",
  "go",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "sql",
  "yaml",
  "yml",
  "toml",
  "ini",
  "log",
  "sh",
  "bash",
  "ps1",
  "bat",
  "env",
  "graphql",
  "proto",
  "svg",
]);

const TEXT_MIME_PREFIXES = [
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-yaml",
  "application/yaml",
  "application/x-sh",
  "application/x-httpd-php",
];

export function isTextFile(name: string, type: string): boolean {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return (
    TEXT_EXTENSIONS.has(extension) || TEXT_MIME_PREFIXES.some((prefix) => type.startsWith(prefix))
  );
}
