import { Request, Response } from "express";
import { chatService } from "../services/chat.service";

export async function listChats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const chats = await chatService.listChats(userId);
    res.json({ chats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list chats";
    res.status(400).json({ message });
  }
}

export async function createChat(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { title, model, assistantId, chatbotId } = req.body as {
      title?: string;
      model?: string;
      assistantId?: string;
      chatbotId?: string;
    };
    const chat = await chatService.createChat(userId, { title, model, assistantId, chatbotId });
    res.status(201).json({ chat });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create chat";
    res.status(400).json({ message });
  }
}

export async function getChat(req: Request, res: Response): Promise<void> {
  try {
    const chatId = req.params.chatId as string;
    const userId = req.user!.userId;
    const result = await chatService.getChat(chatId, userId);
    if (!result.chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get chat";
    res.status(404).json({ message });
  }
}

export async function updateChat(req: Request, res: Response): Promise<void> {
  try {
    const chatId = req.params.chatId as string;
    const userId = req.user!.userId;
    const { title, model } = req.body as { title?: string; model?: string };
    const chat = await chatService.updateChat(chatId, userId, { title, model });
    res.json({ chat });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update chat";
    res.status(400).json({ message });
  }
}

export async function deleteChat(req: Request, res: Response): Promise<void> {
  try {
    const chatId = req.params.chatId as string;
    const userId = req.user!.userId;
    await chatService.deleteChat(chatId, userId);
    res.json({ message: "Chat deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete chat";
    res.status(400).json({ message });
  }
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const chatId = req.params.chatId as string;
    const userId = req.user!.userId;
    const messages = await chatService.getMessages(chatId, userId);
    res.json({ messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get messages";
    res.status(404).json({ message });
  }
}

export async function listFiles(req: Request, res: Response): Promise<void> {
  try {
    const chatId = req.params.chatId as string;
    const userId = req.user!.userId;
    const files = await chatService.listFiles(chatId, userId);
    res.json({ files });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list files";
    res.status(400).json({ message });
  }
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    const chatId = req.params.chatId as string;
    const userId = req.user!.userId;
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }
    const file = await chatService.uploadFile(chatId, userId, req.file);
    res.status(201).json({ file });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to upload file";
    res.status(400).json({ message });
  }
}

export async function sendChatMessage(req: Request, res: Response): Promise<void> {
  const chatId = req.params.chatId as string;
  const userId = req.user!.userId;
  const { content, fileIds } = req.body as { content?: string; fileIds?: string[] };

  if (!content || !content.trim()) {
    res.status(400).json({ message: "Message content is required" });
    return;
  }

  let chatExists: boolean;
  try {
    chatExists = await chatService.chatExists(chatId, userId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to check chat";
    res.status(400).json({ message });
    return;
  }
  if (!chatExists) {
    res.status(404).json({ message: "Chat not found" });
    return;
  }

  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown): void => {
    if (res.writableEnded) {
      return;
    }
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await chatService.sendMessage(
      chatId,
      userId,
      { content: content.trim(), fileIds },
      {
        onUserMessage: (message) => sendEvent("message.started", { message }),
        onContentDelta: (text) => sendEvent("content.delta", { text }),
        onToolStart: (toolCall) => sendEvent("tool.started", { toolCall }),
        onToolEnd: (toolCall) => sendEvent("tool.finished", { toolCall }),
        onAssistantMessage: (message) => sendEvent("message.completed", { message }),
      }
    );
    res.end();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    sendEvent("error", { message });
    res.end();
  }
}
