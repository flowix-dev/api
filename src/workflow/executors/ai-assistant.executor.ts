import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { converse } from "../../chat/puter";
import { getModelInfo, DEFAULT_MODEL_ID } from "../../chat/models";
import { Assistant } from "../../models/Assistant";

export class AiAssistantExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    if (!context?.puterToken) {
      throw new Error("No hay token de Puter conectado");
    }
    if (!context?.userId) {
      throw new Error("No se pudo resolver el usuario");
    }

    const assistantId = String(inputs.assistantId ?? "").trim();
    const prompt = String(inputs.prompt ?? "");
    if (!assistantId) {
      throw new Error("assistantId es requerido");
    }
    if (!prompt) {
      throw new Error("prompt es requerido");
    }

    const assistant = await Assistant.findOne({
      _id: assistantId,
      authorId: context.userId,
    });
    if (!assistant) {
      throw new Error("Asistente no encontrado");
    }

    const modelInfo = getModelInfo(assistant.model) ?? getModelInfo(DEFAULT_MODEL_ID)!;
    const { text } = await converse(context.puterToken, {
      modelId: modelInfo.modelId,
      system: assistant.systemPrompt,
      messages: [{ role: "user", content: [{ text: prompt }] }],
    });

    return {
      outputs: {
        response: text,
        assistantName: assistant.name,
        model: modelInfo.modelId,
      },
    };
  }
}
