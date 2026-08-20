import { Embeddings } from "@langchain/core/embeddings";

const HF_API_KEY = process.env.HF_API_KEY || "";
const MODEL = process.env.EMBEDDINGS_MODEL || "sentence-transformers/all-MiniLM-L6-v2";
const HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction";

class HfApiEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  private async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${HF_API_URL}/${MODEL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(HF_API_KEY ? { Authorization: `Bearer ${HF_API_KEY}` } : {}),
      },
      body: JSON.stringify({ inputs: texts, options: { pooling: "mean", normalize: true } }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const data = (await response.json()) as number[][] | number[][][];
    return Array.isArray(data[0]) && Array.isArray(data[0][0])
      ? (data as number[][])
      : (data as number[][]);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return this.embed(documents);
  }

  async embedQuery(document: string): Promise<number[]> {
    const [vector] = await this.embed([document]);
    return vector;
  }
}

let shared: HfApiEmbeddings | null = null;

export function getEmbeddings(): HfApiEmbeddings {
  if (!shared) {
    shared = new HfApiEmbeddings();
  }
  return shared;
}
