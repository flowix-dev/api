import mongoose from "mongoose";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const OPERATIONS = ["find", "insertOne", "updateOne", "deleteOne", "count"];

export class MongoQueryExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const collectionName = String(inputs.collection ?? "").trim();
    const operation = OPERATIONS.includes(String(inputs.operation))
      ? String(inputs.operation)
      : "find";
    if (!collectionName) {
      throw new Error("collection es requerido");
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("No hay conexión a MongoDB");
    }
    const collection = db.collection(collectionName);
    const filter = parseJson(inputs.query, "query");

    let result: unknown;
    switch (operation) {
      case "find": {
        const limit = Number(inputs.limit ?? 100);
        const max = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 100;
        result = await collection.find(filter).limit(max).toArray();
        break;
      }
      case "insertOne": {
        const document = parseJson(inputs.data, "data");
        const inserted = await collection.insertOne(document);
        result = { insertedId: inserted.insertedId };
        break;
      }
      case "updateOne": {
        const update = parseJson(inputs.data, "data");
        const updated = await collection.updateOne(filter, update);
        result = { matchedCount: updated.matchedCount, modifiedCount: updated.modifiedCount };
        break;
      }
      case "deleteOne": {
        const deleted = await collection.deleteOne(filter);
        result = { deletedCount: deleted.deletedCount };
        break;
      }
      case "count":
        result = { count: await collection.countDocuments(filter) };
        break;
      default:
        result = null;
    }

    return { outputs: { ...inputs, result } };
  }
}

function parseJson(raw: unknown, label: string): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return {};
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON inválido";
      const wrapped = new Error(`${label} inválido: ${message}`);
      (wrapped as Error & { cause?: unknown }).cause = error;
      throw wrapped;
    }
  }
  return {};
}
