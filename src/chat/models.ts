export interface ModelInfo {
  id: string;
  name: string;
  provider: "puter";
  modelId: string;
  description: string;
}

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: "gpt-5-nano",
    name: "GPT-5 nano",
    provider: "puter",
    modelId: "gpt-5-nano",
    description: "Rápido y económico para tareas simples",
  },
  {
    id: "gpt-5.4-nano",
    name: "GPT-5.4 nano",
    provider: "puter",
    modelId: "gpt-5.4-nano",
    description: "Rápido y económico, versión actualizada",
  },
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    provider: "puter",
    modelId: "gpt-5.5",
    description: "Modelo generalista potente de OpenAI",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "puter",
    modelId: "claude-sonnet-4-6",
    description: "Razonamiento fuerte y tool use",
  },
  {
    id: "claude-opus-4-8",
    name: "Claude Opus 4.8",
    provider: "puter",
    modelId: "claude-opus-4-8",
    description: "Modelo de máximo nivel de Anthropic",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "puter",
    modelId: "gemini-3.1-flash-lite",
    description: "Rápido y económico de Google",
  },
  {
    id: "gemini-3.1-flash",
    name: "Gemini 3.1 Flash",
    provider: "puter",
    modelId: "gemini-3.1-flash",
    description: "Equilibrado entre velocidad y calidad",
  },
  {
    id: "openai/gpt-5.3-chat",
    name: "GPT-5.3 Chat",
    provider: "puter",
    modelId: "openai/gpt-5.3-chat",
    description: "Con búsqueda web integrada",
  },
  {
    id: "reka/reka-edge",
    name: "Reka Edge",
    provider: "puter",
    modelId: "reka/reka-edge",
    description: "Multimodal ligero",
  },
];

export const DEFAULT_MODEL_ID = "gpt-5-nano";

export function getModelInfo(id: string): ModelInfo | undefined {
  if (!id) {
    return undefined;
  }
  return MODEL_CATALOG.find((model) => model.id === id || model.modelId === id);
}
