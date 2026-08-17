import { Chatbot } from "../models/Chatbot";
import { NodeDefinition } from "../models/NodeDefinition";
import { User } from "../models/User";
import { IChatbot } from "../interfaces/Chatbot";
import { INodeDefinition } from "../interfaces/NodeDefinition";
import { IWorkflowNode } from "../interfaces/WorkflowNode";
import { executorRegistry } from "../workflow/executors";
import { ExecutionContext } from "../workflow/execution/ExecutionContext";
import type {
  ConverseContentBlock,
  ConverseMessage,
  ConverseStreamParams,
  StreamedToolUse,
} from "../chat/types";
import { streamConverse } from "../chat/puter";
import { getModelInfo, DEFAULT_MODEL_ID } from "../chat/models";
import { buildConverseTool, buildToolName } from "../chat/tools";

const MAX_TOOL_ITERATIONS = 6;

export interface PublicChatEventSink {
  onContentDelta?: (text: string) => void;
  onToolStart?: (name: string) => void;
}

interface PublicChatMessageInput {
  content: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class ChatbotChatService {
  async validatePublicChatbot(
    chatbotId: string,
    token: string,
    origin: string | undefined
  ): Promise<IChatbot> {
    const chatbot = await Chatbot.findOne({ _id: chatbotId, publicToken: token }).lean();
    if (!chatbot) {
      throw new Error("Chatbot no encontrado o token inválido");
    }

    if (chatbot.allowedDomains.length > 0 && origin) {
      const allowed = chatbot.allowedDomains.some((domain) => {
        const trimmed = domain.trim();
        return (
          origin === trimmed ||
          origin === `https://${trimmed}` ||
          origin === `http://${trimmed}` ||
          origin.startsWith(`${trimmed}/`)
        );
      });
      if (!allowed) {
        throw new Error("Dominio no permitido");
      }
    }

    return chatbot;
  }

  async sendMessage(
    chatbot: IChatbot,
    input: PublicChatMessageInput,
    sink: PublicChatEventSink
  ): Promise<string> {
    const modelInfo = getModelInfo(chatbot.model) ?? getModelInfo(DEFAULT_MODEL_ID)!;

    const owner = await User.findById(chatbot.authorId).select("puterToken").lean();
    if (!owner?.puterToken) {
      throw new Error("El dueño del chatbot no tiene Puter conectado");
    }

    const toolDefs = await this.buildTools(chatbot.tools.map((t) => t.fnKey));
    const tools = toolDefs.map(buildConverseTool);
    const system = this.buildSystemPrompt(chatbot, toolDefs);

    const messages = this.buildConversation(input);

    let finalText = "";
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const modelParams: ConverseStreamParams = {
        modelId: modelInfo.modelId,
        system,
        messages,
        tools,
        maxTokens: 2048,
        temperature: chatbot.temperature ?? 0.7,
      };

      let text: string;
      let toolUses: StreamedToolUse[];
      try {
        ({ text, toolUses } = await streamConverse(owner.puterToken, modelParams, (delta) =>
          sink.onContentDelta?.(delta)
        ));
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        const isStreamingToolUseUnsupported =
          /tool use/i.test(errMessage) && /streaming/i.test(errMessage);
        if (!isStreamingToolUseUnsupported) {
          throw error;
        }
        const fallback = await this.nonStreamingConverse(owner.puterToken, modelParams);
        text = fallback.text;
        toolUses = fallback.toolUses;
        if (text) {
          sink.onContentDelta?.(text);
        }
      }

      if (text) {
        finalText += text;
      }

      if (toolUses.length === 0) {
        break;
      }

      const assistantBlocks: ConverseContentBlock[] = [];
      const toolResultBlocks: ConverseContentBlock[] = [];

      for (const toolUse of toolUses) {
        const definition = toolDefs.find((def) => buildToolName(def.fnKey) === toolUse.name);
        assistantBlocks.push({
          toolUse: {
            toolUseId: toolUse.id,
            name: toolUse.name,
            input: toolUse.input,
          },
        });

        if (!definition) {
          toolResultBlocks.push({
            toolResult: {
              toolUseId: toolUse.id,
              content: [{ text: `Unknown tool: ${toolUse.name}` }],
              status: "error",
            },
          });
          continue;
        }

        sink.onToolStart?.(definition.name);
        try {
          const outputs = await this.executeTool(definition, toolUse.input, chatbot);
          toolResultBlocks.push({
            toolResult: {
              toolUseId: toolUse.id,
              content: [{ json: outputs }],
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toolResultBlocks.push({
            toolResult: {
              toolUseId: toolUse.id,
              content: [{ text: `Error: ${message}` }],
              status: "error",
            },
          });
        }
      }

      messages.push({ role: "assistant", content: assistantBlocks });
      messages.push({ role: "user", content: toolResultBlocks });
    }

    return finalText;
  }

  private async nonStreamingConverse(
    token: string,
    params: ConverseStreamParams
  ): Promise<{ text: string; toolUses: StreamedToolUse[] }> {
    const { converse } = await import("../chat/puter");
    return converse(token, params);
  }

  private async buildTools(fnKeys: string[]): Promise<INodeDefinition[]> {
    if (fnKeys.length === 0) {
      return [];
    }
    return NodeDefinition.find({
      fnKey: { $in: fnKeys },
      publicTool: true,
      scope: { $in: ["chat", "all"] },
    })
      .sort({ category: 1, name: 1 })
      .lean();
  }

  private async executeTool(
    definition: INodeDefinition,
    inputs: Record<string, unknown>,
    chatbot: IChatbot
  ): Promise<Record<string, unknown>> {
    const node: IWorkflowNode = {
      id: 0,
      nodeDefinitionId: definition._id,
      disabled: false,
      x: 0,
      y: 0,
      w: 200,
      h: 80,
      inputs,
    };
    const context = new ExecutionContext();
    context.userId = chatbot.authorId.toString();
    const executor = await executorRegistry.getExecutorForNode(node);
    const result = await executor.execute(node, inputs, context);
    return result.outputs;
  }

  private buildConversation(input: PublicChatMessageInput): ConverseMessage[] {
    const messages: ConverseMessage[] = [];

    for (const message of input.history ?? []) {
      if (message.role === "assistant") {
        messages.push({ role: "assistant", content: [{ text: message.content }] });
      } else {
        messages.push({ role: "user", content: [{ text: message.content }] });
      }
    }

    messages.push({ role: "user", content: [{ text: input.content }] });

    return messages;
  }

  private buildSystemPrompt(chatbot: IChatbot, toolDefinitions: INodeDefinition[]): string {
    const toolLines =
      toolDefinitions
        .map((def) => {
          const inputs =
            def.inputs
              .map(
                (input) =>
                  `${input.key}${input.required ? " (required)" : ""}${input.description ? `: ${input.description}` : ""}`
              )
              .join(", ") || "none";
          const outputs = def.outputs.map((output) => output.key).join(", ") || "none";
          return `- ${def.name} (${buildToolName(def.fnKey)}): inputs: ${inputs}; returns: ${outputs}`;
        })
        .join("\n") || "ninguna";

    return [chatbot.systemPrompt, "", "Herramientas disponibles:", toolLines].join("\n");
  }
}

export const chatbotChatService = new ChatbotChatService();
