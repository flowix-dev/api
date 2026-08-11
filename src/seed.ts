import "dotenv/config";
import mongoose from "mongoose";
import { NodeDefinition } from "./models/NodeDefinition";
import { NodeDataType } from "./types/NodeDataType";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/flowix";

const seedNodeDefinitions = [
  {
    name: "No Operation",
    fnKey: "noop",
    category: "utility",
    version: 1,
    inputs: [],
    outputs: [{ key: "result", type: NodeDataType.STRING, description: "Execution confirmation" }],
  },
  {
    name: "Delay",
    fnKey: "delay",
    category: "utility",
    version: 1,
    inputs: [
      {
        key: "delay",
        type: NodeDataType.NUMBER,
        required: false,
        defaultValue: 1000,
        description: "Delay in milliseconds",
      },
    ],
    outputs: [
      { key: "delayed", type: NodeDataType.BOOLEAN, description: "Whether the delay was applied" },
      { key: "delayMs", type: NodeDataType.NUMBER, description: "Actual delay in milliseconds" },
    ],
  },
  {
    name: "Sum",
    fnKey: "sum",
    category: "math",
    version: 1,
    inputs: [
      {
        key: "a",
        type: NodeDataType.NUMBER,
        required: true,
        defaultValue: 0,
        description: "First value",
      },
      {
        key: "b",
        type: NodeDataType.NUMBER,
        required: true,
        defaultValue: 0,
        description: "Second value",
      },
    ],
    outputs: [{ key: "result", type: NodeDataType.NUMBER, description: "Sum of a + b" }],
  },
  {
    name: "HTTP Request",
    fnKey: "http.request",
    category: "actions",
    version: 1,
    inputs: [
      { key: "url", type: NodeDataType.STRING, required: true, description: "Request URL" },
      {
        key: "method",
        type: NodeDataType.STRING,
        required: false,
        defaultValue: "GET",
        description: "HTTP method (GET, POST, PUT, DELETE)",
      },
      {
        key: "headers",
        type: NodeDataType.OBJECT,
        required: false,
        description: "Request headers as JSON object",
      },
      { key: "body", type: NodeDataType.ANY, required: false, description: "Request body" },
    ],
    outputs: [
      { key: "status", type: NodeDataType.NUMBER, description: "HTTP status code" },
      { key: "data", type: NodeDataType.ANY, description: "Response body" },
      { key: "headers", type: NodeDataType.OBJECT, description: "Response headers" },
    ],
  },
  {
    name: "OpenAI Chat",
    fnKey: "openai.chat",
    category: "ai",
    version: 1,
    inputs: [
      {
        key: "model",
        type: NodeDataType.STRING,
        required: false,
        defaultValue: "gpt-4o-mini",
        description: "Model name",
      },
      {
        key: "messages",
        type: NodeDataType.ARRAY,
        required: true,
        description: "Array of { role, content } messages",
      },
      {
        key: "temperature",
        type: NodeDataType.NUMBER,
        required: false,
        defaultValue: 0.7,
        description: "Sampling temperature (0-2)",
      },
      {
        key: "maxTokens",
        type: NodeDataType.NUMBER,
        required: false,
        description: "Maximum tokens in response",
      },
    ],
    outputs: [
      { key: "response", type: NodeDataType.STRING, description: "Generated response text" },
      {
        key: "finishReason",
        type: NodeDataType.STRING,
        description: "Reason the response finished",
      },
      { key: "usage", type: NodeDataType.OBJECT, description: "Token usage stats" },
      { key: "model", type: NodeDataType.STRING, description: "Model used" },
    ],
  },
  {
    name: "Send Email",
    fnKey: "email.send",
    category: "actions",
    version: 1,
    inputs: [
      { key: "to", type: NodeDataType.STRING, required: true, description: "Recipient email" },
      { key: "subject", type: NodeDataType.STRING, required: true, description: "Email subject" },
      { key: "body", type: NodeDataType.STRING, required: true, description: "Email body (HTML)" },
      {
        key: "from",
        type: NodeDataType.STRING,
        required: false,
        description: "Sender email (default from config)",
      },
    ],
    outputs: [
      { key: "messageId", type: NodeDataType.STRING, description: "Message ID from SMTP server" },
      { key: "accepted", type: NodeDataType.ARRAY, description: "List of accepted recipients" },
    ],
  },
  {
    name: "S3 Storage",
    fnKey: "s3.storage",
    category: "storage",
    version: 1,
    inputs: [
      {
        key: "action",
        type: NodeDataType.STRING,
        required: true,
        defaultValue: "list",
        description: "Action: list, get, put",
      },
      { key: "bucket", type: NodeDataType.STRING, required: true, description: "S3 bucket name" },
      {
        key: "key",
        type: NodeDataType.STRING,
        required: false,
        description: "Object key (required for get/put)",
      },
      {
        key: "content",
        type: NodeDataType.STRING,
        required: false,
        description: "File content (required for put)",
      },
    ],
    outputs: [
      { key: "keys", type: NodeDataType.ARRAY, description: "List of object keys (list action)" },
      { key: "content", type: NodeDataType.STRING, description: "Object content (get action)" },
      { key: "etag", type: NodeDataType.STRING, description: "ETag of the object" },
    ],
  },
  {
    name: "SQS Message",
    fnKey: "sqs.message",
    category: "messaging",
    version: 1,
    inputs: [
      {
        key: "action",
        type: NodeDataType.STRING,
        required: true,
        defaultValue: "send",
        description: "Action: send, receive, create-queue",
      },
      {
        key: "queueUrl",
        type: NodeDataType.STRING,
        required: false,
        description: "Queue URL (required for send/receive)",
      },
      {
        key: "queueName",
        type: NodeDataType.STRING,
        required: false,
        description: "Queue name (required for create-queue)",
      },
      {
        key: "messageBody",
        type: NodeDataType.STRING,
        required: false,
        description: "Message body (required for send)",
      },
    ],
    outputs: [
      { key: "messageId", type: NodeDataType.STRING, description: "Message ID (send action)" },
      {
        key: "messages",
        type: NodeDataType.ARRAY,
        description: "Received messages (receive action)",
      },
      {
        key: "queueUrl",
        type: NodeDataType.STRING,
        description: "Created queue URL (create-queue action)",
      },
    ],
  },
];

async function seed(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const def of seedNodeDefinitions) {
      const existing = await NodeDefinition.findOne({ fnKey: def.fnKey });
      if (existing) {
        console.log(`  Skipping "${def.name}" (fnKey: ${def.fnKey}) — already exists`);
      } else {
        await NodeDefinition.create(def);
        console.log(`  Created "${def.name}" (fnKey: ${def.fnKey})`);
      }
    }

    console.log("\nSeed completed successfully");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
