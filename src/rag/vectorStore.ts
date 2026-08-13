import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { getEmbeddings } from "./embeddings";

export interface RagStore {
  addTexts(input: { assistantId: string; fileId: string; texts: string[] }): Promise<void>;
  similaritySearch(input: {
    assistantId: string;
    query: string;
    k?: number;
  }): Promise<Array<{ text: string; order: number; fileId: string }>>;
  deleteFile(input: { assistantId: string; fileId: string }): Promise<void>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface StoredItem {
  id: string;
  vector: number[];
  pageContent: string;
  assistantId: string;
  fileId: string;
  order: number;
}

const STORE_TYPE =
  process.env.VECTOR_STORE || (process.env.NODE_ENV === "production" ? "pinecone" : "local");

class LocalRagStore implements RagStore {
  private readonly filePath: string;
  private items: StoredItem[] = [];
  private loaded = false;

  constructor() {
    const dir = process.env.VECTOR_STORE_DIR || "data";
    this.filePath = `${dir}/vectorstore.json`;
  }

  private load(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    if (!existsSync(this.filePath)) {
      return;
    }
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as StoredItem[];
      this.items = parsed.map((item, index) =>
        typeof item.order === "number" ? item : { ...item, order: index }
      );
    } catch {
      this.items = [];
    }
  }

  private persist(): void {
    if (this.items.length === 0 && !existsSync(this.filePath)) {
      return;
    }
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.items));
  }

  async addTexts(input: { assistantId: string; fileId: string; texts: string[] }): Promise<void> {
    if (input.texts.length === 0) {
      return;
    }
    this.load();
    const vectors = await getEmbeddings().embedDocuments(input.texts);
    for (let i = 0; i < input.texts.length; i++) {
      this.items.push({
        id: randomUUID(),
        vector: vectors[i],
        pageContent: input.texts[i],
        assistantId: input.assistantId,
        fileId: input.fileId,
        order: i,
      });
    }
    this.persist();
  }

  async similaritySearch(input: {
    assistantId: string;
    query: string;
    k?: number;
  }): Promise<Array<{ text: string; order: number; fileId: string }>> {
    this.load();
    const k = input.k ?? 5;
    const queryVector = await getEmbeddings().embedQuery(input.query);
    return this.items
      .filter((item) => item.assistantId === input.assistantId)
      .map((item) => ({
        item,
        score: cosineSimilarity(queryVector, item.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .filter((scored) => scored.score > 0.3)
      .sort((a, b) => a.item.order - b.item.order)
      .map((scored) => ({
        text: scored.item.pageContent,
        order: scored.item.order,
        fileId: scored.item.fileId,
      }));
  }

  async deleteFile(input: { assistantId: string; fileId: string }): Promise<void> {
    this.load();
    const before = this.items.length;
    this.items = this.items.filter(
      (item) => !(item.assistantId === input.assistantId && item.fileId === input.fileId)
    );
    if (this.items.length !== before) {
      this.persist();
    }
  }
}

class PineconeRagStore implements RagStore {
  async addTexts(input: { assistantId: string; fileId: string; texts: string[] }): Promise<void> {
    if (input.texts.length === 0) {
      return;
    }
    const store = await this.storeFor(input.assistantId);
    await store.addDocuments(
      input.texts.map((text, index) => ({
        pageContent: text,
        metadata: { fileId: input.fileId, order: index },
      }))
    );
  }

  async similaritySearch(input: {
    assistantId: string;
    query: string;
    k?: number;
  }): Promise<Array<{ text: string; order: number; fileId: string }>> {
    const store = await this.storeFor(input.assistantId);
    const results = await store.similaritySearch(input.query, input.k ?? 5);
    return results
      .map((result) => ({
        text: result.pageContent,
        order: Number((result.metadata?.order as number) ?? 0),
        fileId: String(result.metadata?.fileId ?? ""),
      }))
      .sort((a, b) => a.order - b.order);
  }

  async deleteFile(input: { assistantId: string; fileId: string }): Promise<void> {
    const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" });
    const index = client.Index(process.env.PINECONE_INDEX || "");
    await index.namespace(`assistant-${input.assistantId}`).deleteMany({
      filter: { fileId: { $eq: input.fileId } },
    });
  }

  private async storeFor(assistantId: string) {
    const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" });
    const index = client.Index(process.env.PINECONE_INDEX || "");
    return PineconeStore.fromExistingIndex(getEmbeddings(), {
      pineconeIndex: index,
      namespace: `assistant-${assistantId}`,
    });
  }
}

let sharedStore: RagStore | null = null;

export function getRagStore(): RagStore {
  if (!sharedStore) {
    sharedStore = STORE_TYPE === "pinecone" ? new PineconeRagStore() : new LocalRagStore();
  }
  return sharedStore;
}
