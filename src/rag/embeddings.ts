import { Embeddings } from "@langchain/core/embeddings";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL = process.env.EMBEDDINGS_MODEL || "Xenova/multilingual-e5-small";

class HfEmbeddings extends Embeddings {
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

  constructor(fields: Record<string, never> = {}) {
    super(fields);
  }

  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = pipeline(
        "feature-extraction",
        MODEL
      ) as Promise<FeatureExtractionPipeline>;
    }
    return this.pipelinePromise;
  }

  private async embed(texts: string[]): Promise<number[][]> {
    const featureExtractor = await this.getPipeline();
    const output = await featureExtractor(texts, {
      pooling: "mean",
      normalize: true,
    });
    const data = output as unknown as { tolist: () => number[][] };
    return data.tolist();
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return this.embed(documents.map((doc) => `passage: ${doc}`));
  }

  async embedQuery(document: string): Promise<number[]> {
    const [vector] = await this.embed([`query: ${document}`]);
    return vector;
  }
}

let shared: HfEmbeddings | null = null;

export function getEmbeddings(): HfEmbeddings {
  if (!shared) {
    shared = new HfEmbeddings();
  }
  return shared;
}
