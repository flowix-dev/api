import { randomUUID } from "node:crypto";
import { Assistant } from "../models/Assistant";
import { User } from "../models/User";
import { IAssistant } from "../interfaces/Assistant";
import { getModelInfo, DEFAULT_MODEL_ID } from "../chat/models";
import { parseFileBuffer } from "../utils/fileParser";
import { chunkText } from "../rag/chunkText";
import { getRagStore } from "../rag/vectorStore";
import {
  ensureWorkflowFilesBucket,
  putWorkflowFile,
  deleteWorkflowFile,
} from "../utils/fileStorage";

export interface UploadedAssistantFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const ASSISTANT_FILES_PREFIX = "assistant-files";

export class AssistantService {
  async listAssistants(userId: string): Promise<IAssistant[]> {
    return Assistant.find({ authorId: userId }).sort({ updatedAt: -1 }).lean();
  }

  async getAssistant(assistantId: string, userId: string): Promise<IAssistant> {
    const assistant = await Assistant.findOne({
      _id: assistantId,
      authorId: userId,
    }).lean();
    if (!assistant) {
      throw new Error("Assistant not found");
    }
    return assistant;
  }

  async createAssistant(
    userId: string,
    input: { name: string; systemPrompt: string; model?: string }
  ): Promise<IAssistant> {
    const modelInfo = getModelInfo(input.model ?? "") ?? getModelInfo(DEFAULT_MODEL_ID);
    return Assistant.create({
      authorId: userId,
      name: input.name.trim(),
      systemPrompt: input.systemPrompt.trim(),
      model: modelInfo!.id,
      files: [],
    });
  }

  async updateAssistant(
    assistantId: string,
    userId: string,
    input: { name?: string; systemPrompt?: string; model?: string }
  ): Promise<IAssistant> {
    const updates: { name?: string; systemPrompt?: string; model?: string } = {};
    if (input.name !== undefined) {
      updates.name = input.name.trim();
    }
    if (input.systemPrompt !== undefined) {
      updates.systemPrompt = input.systemPrompt.trim();
    }
    if (input.model !== undefined) {
      const modelInfo = getModelInfo(input.model);
      if (!modelInfo) {
        throw new Error("Unknown model");
      }
      updates.model = modelInfo.id;
    }
    const assistant = await Assistant.findOneAndUpdate(
      { _id: assistantId, authorId: userId },
      { $set: updates },
      { returnDocument: "after" }
    );
    if (!assistant) {
      throw new Error("Assistant not found");
    }
    return assistant;
  }

  async deleteAssistant(assistantId: string, userId: string): Promise<void> {
    const assistant = await Assistant.findOneAndDelete({
      _id: assistantId,
      authorId: userId,
    });
    if (!assistant) {
      throw new Error("Assistant not found");
    }
    for (const file of assistant.files) {
      await deleteWorkflowFile(file.key).catch(() => {});
      await getRagStore()
        .deleteFile({ assistantId: assistant._id.toString(), fileId: file.name })
        .catch(() => {});
    }
  }

  async uploadFile(
    assistantId: string,
    userId: string,
    file: UploadedAssistantFile
  ): Promise<IAssistant> {
    const assistant = await Assistant.findOne({
      _id: assistantId,
      authorId: userId,
    });
    if (!assistant) {
      throw new Error("Assistant not found");
    }

    await ensureWorkflowFilesBucket();

    const safeName = file.originalname.replace(/[^\w.\- ]/g, "_");
    const key = `${ASSISTANT_FILES_PREFIX}/${assistantId}/${randomUUID()}-${safeName}`;
    await putWorkflowFile(key, file.buffer, file.mimetype, {
      originalname: safeName,
    });

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
        assistantId: assistant._id.toString(),
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

    assistant.files.push(fileRecord);
    await assistant.save();
    return assistant.toObject();
  }

  async deleteFile(assistantId: string, userId: string, fileName: string): Promise<IAssistant> {
    const assistant = await Assistant.findOne({
      _id: assistantId,
      authorId: userId,
    });
    if (!assistant) {
      throw new Error("Assistant not found");
    }
    const file = assistant.files.find((f) => f.name === fileName);
    if (!file) {
      throw new Error("File not found");
    }
    await deleteWorkflowFile(file.key).catch(() => {});
    await getRagStore()
      .deleteFile({ assistantId: assistant._id.toString(), fileId: fileName })
      .catch(() => {});
    assistant.files = assistant.files.filter((f) => f.name !== fileName);
    await assistant.save();
    return assistant.toObject();
  }

  async retrieveContext(
    assistantId: string,
    userId: string,
    query: string,
    k = 5
  ): Promise<string> {
    const assistant = await this.getAssistant(assistantId, userId);
    if (assistant.files.length === 0) {
      return "";
    }
    const chunks = await getRagStore().similaritySearch({
      assistantId: assistant._id.toString(),
      query,
      k,
    });
    return chunks
      .map((chunk) => `Fragmento ${chunk.order + 1} de ${chunk.fileId}:\n${chunk.text}`)
      .join("\n\n");
  }
}

export const assistantService = new AssistantService();
