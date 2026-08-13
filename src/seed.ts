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
    isTool: false,
    inputs: [],
    outputs: [{ key: "result", type: NodeDataType.STRING, description: "Execution confirmation" }],
  },
  {
    name: "Delay",
    fnKey: "delay",
    category: "utility",
    version: 1,
    isTool: true,
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
    isTool: true,
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
    isTool: true,
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
    isTool: false,
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
    isTool: true,
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
    name: "File Upload",
    fnKey: "file.upload",
    category: "files",
    version: 1,
    isTool: false,
    inputs: [
      {
        key: "file",
        type: NodeDataType.FILE,
        required: true,
        description: "Archivo a subir (se elige al ejecutar)",
      },
    ],
    outputs: [
      { key: "url", type: NodeDataType.STRING, description: "URL del archivo subido" },
      { key: "key", type: NodeDataType.STRING, description: "Clave S3 del archivo" },
      { key: "name", type: NodeDataType.STRING, description: "Nombre original del archivo" },
      { key: "size", type: NodeDataType.NUMBER, description: "Tamaño en bytes" },
      { key: "type", type: NodeDataType.STRING, description: "Tipo MIME" },
    ],
  },
  {
    name: "File Parser",
    fnKey: "file.parser",
    category: "files",
    version: 1,
    isTool: false,
    inputs: [
      {
        key: "url",
        type: NodeDataType.STRING,
        required: true,
        description: "URL del archivo (salida de File Upload)",
      },
    ],
    outputs: [
      { key: "text", type: NodeDataType.STRING, description: "Contenido extraído" },
      { key: "format", type: NodeDataType.STRING, description: "Formato detectado" },
      { key: "rows", type: NodeDataType.ARRAY, description: "Filas parseadas (csv/xlsx)" },
    ],
  },
];

async function seed(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const def of seedNodeDefinitions) {
      const updated = await NodeDefinition.findOneAndUpdate(
        { fnKey: def.fnKey },
        { $set: def },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      console.log(
        `  Upserted "${updated.name}" (fnKey: ${updated.fnKey}, isTool: ${updated.isTool})`
      );
    }

    const seedFnKeys = seedNodeDefinitions.map((def) => def.fnKey);
    const removed = await NodeDefinition.deleteMany({
      fnKey: { $nin: seedFnKeys },
    });
    if (removed.deletedCount > 0) {
      console.log(`  Removed ${removed.deletedCount} obsolete definitions`);
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
