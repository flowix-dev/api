import { SQSClient } from "@aws-sdk/client-sqs";

const SQS_ENDPOINT = process.env.SQS_ENDPOINT || "http://localhost:4566";
const SQS_REGION = process.env.SQS_REGION || "us-east-1";
const SQS_ACCESS_KEY = process.env.SQS_ACCESS_KEY || "test";
const SQS_SECRET_KEY = process.env.SQS_SECRET_KEY || "test";

let client: SQSClient | null = null;

export function getSQSClient(): SQSClient {
  if (!client) {
    client = new SQSClient({
      region: SQS_REGION,
      endpoint: SQS_ENDPOINT,
      credentials: {
        accessKeyId: SQS_ACCESS_KEY,
        secretAccessKey: SQS_SECRET_KEY,
      },
    });
  }

  return client;
}
