import { randomUUID, randomBytes } from "node:crypto";
import { Chatbot } from "../models/Chatbot";
import { NodeDefinition } from "../models/NodeDefinition";
import { User } from "../models/User";
import { IChatbot, IChatbotTool } from "../interfaces/Chatbot";
import { getModelInfo, DEFAULT_MODEL_ID } from "../chat/models";
import { parseFileBuffer } from "../utils/fileParser";
import { chunkText } from "../rag/chunkText";
import { getRagStore } from "../rag/vectorStore";
import {
  ensureWorkflowFilesBucket,
  putWorkflowFile,
  deleteWorkflowFile,
} from "../utils/fileStorage";

export interface UploadedChatbotFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const CHATBOT_FILES_PREFIX = "chatbot-files";

export class ChatbotService {
  async listChatbots(userId: string): Promise<IChatbot[]> {
    return Chatbot.find({ authorId: userId }).sort({ updatedAt: -1 }).lean();
  }

  async getChatbot(chatbotId: string, userId: string): Promise<IChatbot> {
    const chatbot = await Chatbot.findOne({ _id: chatbotId, authorId: userId }).lean();
    if (!chatbot) {
      throw new Error("Chatbot not found");
    }
    return chatbot;
  }

  async createChatbot(
    userId: string,
    input: {
      name: string;
      systemPrompt: string;
      model?: string;
      allowFileUpload?: boolean;
      tools?: IChatbotTool[];
      allowedDomains?: string[];
      welcomeMessage?: string;
      placeholder?: string;
      primaryColor?: string;
      position?: "bottom-left" | "bottom-right";
      autoOpen?: boolean;
      showPoweredBy?: boolean;
      temperature?: number;
    }
  ): Promise<IChatbot> {
    const modelInfo = getModelInfo(input.model ?? "") ?? getModelInfo(DEFAULT_MODEL_ID);
    const tools = await this.validateSafeTools(input.tools ?? []);

    return Chatbot.create({
      authorId: userId,
      name: input.name.trim(),
      systemPrompt: input.systemPrompt.trim(),
      model: modelInfo!.id,
      temperature: input.temperature,
      welcomeMessage: input.welcomeMessage?.trim(),
      placeholder: input.placeholder?.trim(),
      allowFileUpload: input.allowFileUpload ?? false,
      tools,
      primaryColor: input.primaryColor?.trim(),
      position: input.position ?? "bottom-right",
      autoOpen: input.autoOpen ?? false,
      showPoweredBy: input.showPoweredBy ?? true,
      publicToken: randomBytes(24).toString("hex"),
      allowedDomains: (input.allowedDomains ?? []).map((d) => d.trim()).filter(Boolean),
      files: [],
    });
  }

  async updateChatbot(
    chatbotId: string,
    userId: string,
    input: Partial<{
      name: string;
      systemPrompt: string;
      model: string;
      allowFileUpload: boolean;
      tools: IChatbotTool[];
      allowedDomains: string[];
      welcomeMessage: string;
      placeholder: string;
      primaryColor: string;
      position: "bottom-left" | "bottom-right";
      autoOpen: boolean;
      showPoweredBy: boolean;
      temperature: number;
      avatarUrl: string;
    }>
  ): Promise<IChatbot> {
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.systemPrompt !== undefined) updates.systemPrompt = input.systemPrompt.trim();
    if (input.avatarUrl !== undefined) updates.avatarUrl = input.avatarUrl.trim();

    if (input.model !== undefined) {
      const modelInfo = getModelInfo(input.model);
      if (!modelInfo) {
        throw new Error("Unknown model");
      }
      updates.model = modelInfo.id;
    }

    if (input.temperature !== undefined) updates.temperature = input.temperature;
    if (input.allowFileUpload !== undefined) updates.allowFileUpload = input.allowFileUpload;
    if (input.welcomeMessage !== undefined) updates.welcomeMessage = input.welcomeMessage?.trim();
    if (input.placeholder !== undefined) updates.placeholder = input.placeholder?.trim();
    if (input.primaryColor !== undefined) updates.primaryColor = input.primaryColor?.trim();
    if (input.position !== undefined) updates.position = input.position;
    if (input.autoOpen !== undefined) updates.autoOpen = input.autoOpen;
    if (input.showPoweredBy !== undefined) updates.showPoweredBy = input.showPoweredBy;
    if (input.allowedDomains !== undefined) {
      updates.allowedDomains = input.allowedDomains.map((d) => d.trim()).filter(Boolean);
    }

    if (input.tools !== undefined) {
      updates.tools = await this.validateSafeTools(input.tools);
    }

    const chatbot = await Chatbot.findOneAndUpdate(
      { _id: chatbotId, authorId: userId },
      { $set: updates },
      { returnDocument: "after" }
    );
    if (!chatbot) {
      throw new Error("Chatbot not found");
    }
    return chatbot;
  }

  async deleteChatbot(chatbotId: string, userId: string): Promise<void> {
    const chatbot = await Chatbot.findOneAndDelete({ _id: chatbotId, authorId: userId });
    if (!chatbot) {
      throw new Error("Chatbot not found");
    }
    for (const file of chatbot.files) {
      await deleteWorkflowFile(file.key).catch(() => {});
      await getRagStore()
        .deleteFile({ assistantId: chatbot._id.toString(), fileId: file.name })
        .catch(() => {});
    }
  }

  async regenerateToken(chatbotId: string, userId: string): Promise<string> {
    const chatbot = await Chatbot.findOneAndUpdate(
      { _id: chatbotId, authorId: userId },
      { $set: { publicToken: randomBytes(24).toString("hex") } },
      { returnDocument: "after" }
    );
    if (!chatbot) {
      throw new Error("Chatbot not found");
    }
    return chatbot.publicToken;
  }

  async uploadFile(
    chatbotId: string,
    userId: string,
    file: UploadedChatbotFile
  ): Promise<IChatbot> {
    const chatbot = await Chatbot.findOne({ _id: chatbotId, authorId: userId });
    if (!chatbot) {
      throw new Error("Chatbot not found");
    }

    await ensureWorkflowFilesBucket();

    const safeName = file.originalname.replace(/[^\w.\- ]/g, "_");
    const key = `${CHATBOT_FILES_PREFIX}/${chatbotId}/${randomUUID()}-${safeName}`;
    await putWorkflowFile(key, file.buffer, file.mimetype, { originalname: safeName });

    const user = await User.findById(userId).select("puterToken").lean();
    const parsed = await parseFileBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      user?.puterToken ?? null
    );

    const chunks = chunkText(parsed.text || "");
    if (chunks.length > 0) {
      await getRagStore().addTexts({
        assistantId: chatbot._id.toString(),
        fileId: safeName,
        texts: chunks,
      });
    }

    const fileRecord = {
      key,
      name: safeName,
      type: file.mimetype,
      size: file.size,
    };

    chatbot.files.push(fileRecord);
    await chatbot.save();
    return chatbot.toObject();
  }

  async deleteFile(chatbotId: string, userId: string, fileName: string): Promise<IChatbot> {
    const chatbot = await Chatbot.findOne({ _id: chatbotId, authorId: userId });
    if (!chatbot) {
      throw new Error("Chatbot not found");
    }
    const file = chatbot.files.find((f) => f.name === fileName);
    if (!file) {
      throw new Error("File not found");
    }
    await deleteWorkflowFile(file.key).catch(() => {});
    await getRagStore()
      .deleteFile({ assistantId: chatbot._id.toString(), fileId: fileName })
      .catch(() => {});
    chatbot.files = chatbot.files.filter((f) => f.name !== fileName);
    await chatbot.save();
    return chatbot.toObject();
  }

  async retrieveContext(chatbotId: string, userId: string, query: string, k = 5): Promise<string> {
    const chatbot = await this.getChatbot(chatbotId, userId);
    if (chatbot.files.length === 0) {
      return "";
    }
    const chunks = await getRagStore().similaritySearch({
      assistantId: chatbot._id.toString(),
      query,
      k,
    });
    return chunks
      .map((chunk) => `Fragmento ${chunk.order + 1} de ${chunk.fileId}:\n${chunk.text}`)
      .join("\n\n");
  }

  private async validateSafeTools(tools: IChatbotTool[]): Promise<IChatbotTool[]> {
    const fnKeys = tools.map((t) => t.fnKey).filter(Boolean);
    if (fnKeys.length === 0) {
      return [];
    }
    const defs = await NodeDefinition.find({
      fnKey: { $in: fnKeys },
      publicTool: true,
      scope: { $in: ["chat", "all"] },
    }).lean();

    return defs.map((def) => ({
      fnKey: def.fnKey,
      name: def.name,
    }));
  }
}

export const chatbotService = new ChatbotService();
