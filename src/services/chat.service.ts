import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { IChat } from "../interfaces/Chat";
import { IChatFile } from "../interfaces/ChatFile";
import { IChatMessage, IAttachment, IToolCall } from "../interfaces/ChatMessage";
import { INodeDefinition } from "../interfaces/NodeDefinition";
import { IWorkflowNode } from "../interfaces/WorkflowNode";
import { Chat } from "../models/Chat";
import { ChatFile } from "../models/ChatFile";
import { ChatMessage } from "../models/ChatMessage";
import { NodeDefinition } from "../models/NodeDefinition";
import { executorRegistry } from "../workflow/executors";
import type {
  ConverseContentBlock,
  ConverseMessage,
  ConverseStreamParams,
  ConverseTool,
  StreamedToolUse,
} from "../chat/types";
import { converse as puterConverse, streamConverse as puterStreamConverse } from "../chat/puter";
import { DEFAULT_MODEL_ID, getModelInfo } from "../chat/models";
import { User } from "../models/User";
import { buildConverseTool, buildToolName } from "../chat/tools";
import { inferToolInputs, matchToolByKeywords } from "../chat/toolKeywords";
import { buildMockGenericReply, buildMockReply } from "../chat/mockReply";
import {
  deleteChatFile,
  ensureChatFilesBucket,
  getChatFileText,
  isTextFile,
  putChatFile,
} from "../chat/storage";

const MAX_TOOL_ITERATIONS = 4;
const MAX_INLINE_FILE_CHARS = 20000;

export interface ToolCallEvent {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status: "completed" | "failed";
}

export interface ChatEventSink {
  onUserMessage?: (message: IChatMessage) => void;
  onContentDelta?: (text: string) => void;
  onToolStart?: (call: ToolCallEvent) => void;
  onToolEnd?: (call: ToolCallEvent) => void;
  onAssistantMessage?: (message: IChatMessage) => void;
}

interface SendMessageInput {
  content: string;
  fileIds?: string[];
}

interface ToolExecution {
  toolCall: IToolCall;
  event: ToolCallEvent;
  toolResult: ConverseContentBlock["toolResult"];
}

export class ChatService {
  async listChats(userId: string): Promise<IChat[]> {
    return Chat.find({ authorId: userId }).sort({ updatedAt: -1 }).lean();
  }

  async createChat(userId: string, input: { title?: string; model?: string }): Promise<IChat> {
    const modelInfo = getModelInfo(input.model ?? "") ?? getModelInfo(DEFAULT_MODEL_ID);
    const title = input.title?.trim() || `Chat ${modelInfo!.name}`;

    return Chat.create({
      authorId: userId,
      title,
      model: modelInfo!.id,
    });
  }

  async getChat(
    chatId: string,
    userId: string
  ): Promise<{ chat: IChat | null; messages: IChatMessage[] }> {
    const chat = await Chat.findOne({ _id: chatId, authorId: userId }).lean();
    if (!chat) {
      return { chat: null, messages: [] };
    }
    const messages = await ChatMessage.find({ chatId: chat._id }).sort({ createdAt: 1 }).lean();
    return { chat, messages };
  }

  async chatExists(chatId: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(chatId)) {
      return false;
    }
    const chat = await Chat.exists({ _id: chatId, authorId: userId });
    return !!chat;
  }

  async updateChat(
    chatId: string,
    userId: string,
    input: { title?: string; model?: string }
  ): Promise<IChat> {
    const updates: { title?: string; model?: string } = {};
    if (input.title !== undefined) {
      updates.title = input.title.trim();
    }
    if (input.model !== undefined) {
      const modelInfo = getModelInfo(input.model);
      if (!modelInfo) {
        throw new Error("Unknown model");
      }
      updates.model = modelInfo.id;
    }
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, authorId: userId },
      { $set: updates },
      { returnDocument: "after" }
    );
    if (!chat) {
      throw new Error("Chat not found");
    }
    return chat;
  }

  async deleteChat(chatId: string, userId: string): Promise<void> {
    const chat = await Chat.findOneAndDelete({ _id: chatId, authorId: userId });
    if (!chat) {
      throw new Error("Chat not found");
    }
    const files = await ChatFile.find({ chatId: chat._id }).lean();
    for (const file of files) {
      await deleteChatFile(file.s3Key);
    }
    await Promise.all([
      ChatFile.deleteMany({ chatId: chat._id }),
      ChatMessage.deleteMany({ chatId: chat._id }),
    ]);
  }

  async getMessages(chatId: string, userId: string): Promise<IChatMessage[]> {
    const chat = await Chat.findOne({ _id: chatId, authorId: userId }).lean();
    if (!chat) {
      throw new Error("Chat not found");
    }
    return ChatMessage.find({ chatId: chat._id }).sort({ createdAt: 1 }).lean();
  }

  async listFiles(chatId: string, userId: string): Promise<IChatFile[]> {
    const chat = await Chat.findOne({ _id: chatId, authorId: userId }).lean();
    if (!chat) {
      throw new Error("Chat not found");
    }
    return ChatFile.find({ chatId: chat._id }).sort({ createdAt: -1 }).lean();
  }

  async uploadFile(chatId: string, userId: string, file: Express.Multer.File): Promise<IChatFile> {
    const chat = await Chat.findOne({ _id: chatId, authorId: userId }).lean();
    if (!chat) {
      throw new Error("Chat not found");
    }

    await ensureChatFilesBucket();
    const key = `chats/${chatId}/${randomUUID()}-${file.originalname}`;
    await putChatFile(key, file.buffer, file.mimetype);

    return ChatFile.create({
      chatId: chat._id,
      authorId: userId,
      name: file.originalname,
      type: file.mimetype || "application/octet-stream",
      size: file.size,
      s3Key: key,
    });
  }

  async sendMessage(
    chatId: string,
    userId: string,
    input: SendMessageInput,
    sink: ChatEventSink
  ): Promise<IChatMessage> {
    const chat = await Chat.findOne({ _id: chatId, authorId: userId }).lean();
    if (!chat) {
      throw new Error("Chat not found");
    }
    const modelInfo = getModelInfo(chat.model) ?? getModelInfo(DEFAULT_MODEL_ID)!;

    const user = await User.findById(userId).select("puterToken").lean();
    const puterToken = user?.puterToken ?? null;

    const validFileIds = (input.fileIds ?? []).filter((id) => Types.ObjectId.isValid(id));
    const referencedFiles = await ChatFile.find({
      _id: { $in: validFileIds },
      chatId: chat._id,
      authorId: userId,
    }).lean();
    const attachments: IAttachment[] = referencedFiles.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      s3Key: file.s3Key,
    }));

    const userMessage = await ChatMessage.create({
      chatId: chat._id,
      authorId: userId,
      role: "user",
      content: input.content,
      attachments,
      toolCalls: [],
    });
    sink.onUserMessage?.(userMessage);

    const toolDefinitions = await NodeDefinition.find({ isTool: true }).sort({
      category: 1,
      name: 1,
    });
    const tools: ConverseTool[] = toolDefinitions.map(buildConverseTool);

    const history = await ChatMessage.find({ chatId: chat._id }).sort({ createdAt: 1 }).lean();
    const messages = await this.buildConversation(history);
    const system = this.buildSystemPrompt(toolDefinitions);

    let finalText = "";
    const finalToolCalls: IToolCall[] = [];
    const usedToolFnKeys = new Set<string>();
    let modelAvailable = puterToken !== null;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      if (!modelAvailable) {
        const matched = matchToolByKeywords(
          input.content,
          toolDefinitions.map((def) => def.fnKey),
          usedToolFnKeys
        );
        if (matched) {
          const definition = toolDefinitions.find((def) => def.fnKey === matched)!;
          const execution = await this.runToolExecution(
            definition,
            {
              id: `heuristic-${Date.now()}`,
              name: buildToolName(matched),
              input: inferToolInputs(matched, input.content),
            },
            sink
          );
          usedToolFnKeys.add(matched);
          finalToolCalls.push(execution.toolCall);
          finalText = buildMockReply(execution.toolCall);
        } else {
          finalText = buildMockGenericReply(input.content);
        }
        sink.onContentDelta?.(finalText);
        break;
      }

      let text: string;
      let toolUses: StreamedToolUse[];
      const modelParams: ConverseStreamParams = {
        modelId: modelInfo.modelId,
        system,
        messages,
        tools,
        maxTokens: 2048,
        temperature: 0.7,
      };
      try {
        ({ text, toolUses } = await puterStreamConverse(puterToken!, modelParams, (delta) =>
          sink.onContentDelta?.(delta)
        ));
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        const isStreamingToolUseUnsupported =
          /tool use/i.test(errMessage) && /streaming/i.test(errMessage);
        if (isStreamingToolUseUnsupported) {
          const result = await puterConverse(puterToken!, modelParams);
          text = result.text;
          toolUses = result.toolUses;
          if (text) {
            sink.onContentDelta?.(text);
          }
        } else if (iteration > 0) {
          throw error;
        } else {
          console.error("[chat] Model provider unavailable, using mock fallback:", errMessage);
          modelAvailable = false;
          continue;
        }
      }

      if (text) {
        finalText += text;
      }

      if (toolUses.length === 0) {
        if (iteration === 0 && finalToolCalls.length === 0) {
          const matched = matchToolByKeywords(
            input.content,
            toolDefinitions.map((def) => def.fnKey),
            usedToolFnKeys
          );
          if (matched) {
            const definition = toolDefinitions.find((def) => def.fnKey === matched)!;
            const execution = await this.runToolExecution(
              definition,
              {
                id: `heuristic-${Date.now()}`,
                name: buildToolName(matched),
                input: inferToolInputs(matched, input.content),
              },
              sink
            );
            usedToolFnKeys.add(matched);
            finalToolCalls.push(execution.toolCall);
            messages.push({
              role: "assistant",
              content: [
                {
                  toolUse: {
                    toolUseId: execution.toolCall.id,
                    name: execution.toolCall.name,
                    input: execution.toolCall.arguments,
                  },
                },
              ],
            });
            messages.push({
              role: "user",
              content: [{ toolResult: execution.toolResult }],
            });
            continue;
          }
        }
        break;
      }

      const assistantBlocks: ConverseContentBlock[] = [];
      const toolResultBlocks: ConverseContentBlock[] = [];

      for (const toolUse of toolUses) {
        const definition = toolDefinitions.find((def) => buildToolName(def.fnKey) === toolUse.name);
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

        usedToolFnKeys.add(definition.fnKey);
        const execution = await this.runToolExecution(definition, toolUse, sink);
        finalToolCalls.push(execution.toolCall);
        toolResultBlocks.push({ toolResult: execution.toolResult });
      }

      messages.push({ role: "assistant", content: assistantBlocks });
      messages.push({ role: "user", content: toolResultBlocks });
    }

    const assistantMessage = await ChatMessage.create({
      chatId: chat._id,
      authorId: userId,
      role: "assistant",
      content: finalText,
      attachments: [],
      toolCalls: finalToolCalls,
    });
    sink.onAssistantMessage?.(assistantMessage);

    return assistantMessage;
  }

  private async runToolExecution(
    definition: INodeDefinition,
    toolUse: StreamedToolUse,
    sink: ChatEventSink
  ): Promise<ToolExecution> {
    const event: ToolCallEvent = {
      id: toolUse.id,
      name: definition.fnKey,
      arguments: toolUse.input,
      status: "completed",
    };
    sink.onToolStart?.(event);

    try {
      const outputs = await this.executeTool(definition, toolUse.input);
      event.output = outputs;
      const toolCall: IToolCall = {
        id: toolUse.id,
        name: definition.fnKey,
        arguments: toolUse.input,
        output: outputs,
        status: "completed",
      };
      const toolResult: ConverseContentBlock["toolResult"] = {
        toolUseId: toolUse.id,
        content: [{ json: outputs }],
      };
      sink.onToolEnd?.(event);
      return { toolCall, event, toolResult };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      event.status = "failed";
      event.error = message;
      const toolCall: IToolCall = {
        id: toolUse.id,
        name: definition.fnKey,
        arguments: toolUse.input,
        error: message,
        status: "failed",
      };
      const toolResult: ConverseContentBlock["toolResult"] = {
        toolUseId: toolUse.id,
        content: [{ text: `Error: ${message}` }],
        status: "error",
      };
      sink.onToolEnd?.(event);
      return { toolCall, event, toolResult };
    }
  }

  private async executeTool(
    definition: INodeDefinition,
    inputs: Record<string, unknown>
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
    const executor = await executorRegistry.getExecutorForNode(node);
    const result = await executor.execute(node, inputs);
    return result.outputs;
  }

  private async buildConversation(history: IChatMessage[]): Promise<ConverseMessage[]> {
    const messages: ConverseMessage[] = [];

    for (const message of history) {
      if (message.role === "user") {
        let text = message.content || "";
        for (const attachment of message.attachments) {
          if (isTextFile(attachment.name, attachment.type)) {
            try {
              const content = await getChatFileText(attachment.s3Key);
              if (content) {
                text += `\n\n[Adjunto: ${attachment.name}]\n${content.slice(0, MAX_INLINE_FILE_CHARS)}`;
              }
            } catch {
              text += `\n\n[Adjunto: ${attachment.name} (no se pudo leer)]`;
            }
          } else {
            text += `\n\n[Adjunto: ${attachment.name} (${attachment.type}, ${attachment.size} bytes)]`;
          }
        }
        messages.push({ role: "user", content: [{ text }] });
      } else {
        messages.push({ role: "assistant", content: [{ text: message.content }] });
      }
    }

    return messages;
  }

  private buildSystemPrompt(toolDefinitions: INodeDefinition[]): string {
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

    return [
      "Eres Flowpath Assistant, un asistente integrado en la plataforma Flowpath de automatización y workflows.",
      "Responde siempre en el mismo idioma que usa el usuario.",
      "Cuando el usuario pida una acción que corresponda a una de las herramientas disponibles, usa esa herramienta ejecutándola y entrega el resultado.",
      "Formatea tus respuestas con Markdown: usa tablas, listas y bloques de código con su lenguaje cuando aporten claridad.",
      `Herramientas disponibles:\n${toolLines}`,
    ].join("\n\n");
  }
}

export const chatService = new ChatService();
