import { S3Client } from "@aws-sdk/client-s3";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:4566";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "test";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "test";

let client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
    });
  }

  return client;
}
