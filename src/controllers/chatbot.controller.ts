import { Request, Response } from "express";
import { chatbotService } from "../services/chatbot.service";
import { IChatbotTool } from "../interfaces/Chatbot";

export async function listChatbots(req: Request, res: Response): Promise<void> {
  try {
    const chatbots = await chatbotService.listChatbots(req.user!.userId);
    res.json({ chatbots });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to list chatbots",
    });
  }
}

export async function createChatbot(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as {
      name?: string;
      systemPrompt?: string;
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
    };
    if (!body.name?.trim() || !body.systemPrompt?.trim()) {
      res.status(400).json({ message: "Name and system prompt are required" });
      return;
    }
    const chatbot = await chatbotService.createChatbot(req.user!.userId, {
      name: body.name as string,
      systemPrompt: body.systemPrompt as string,
      model: body.model,
      allowFileUpload: body.allowFileUpload,
      tools: body.tools,
      allowedDomains: body.allowedDomains,
      welcomeMessage: body.welcomeMessage,
      placeholder: body.placeholder,
      primaryColor: body.primaryColor,
      position: body.position,
      autoOpen: body.autoOpen,
      showPoweredBy: body.showPoweredBy,
      temperature: body.temperature,
    });
    res.status(201).json({ chatbot });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to create chatbot",
    });
  }
}

export async function getChatbot(req: Request, res: Response): Promise<void> {
  try {
    const chatbot = await chatbotService.getChatbot(
      req.params.chatbotId as string,
      req.user!.userId
    );
    res.json({ chatbot });
  } catch (error: unknown) {
    res.status(404).json({
      message: error instanceof Error ? error.message : "Failed to get chatbot",
    });
  }
}

export async function updateChatbot(req: Request, res: Response): Promise<void> {
  try {
    const chatbot = await chatbotService.updateChatbot(
      req.params.chatbotId as string,
      req.user!.userId,
      req.body
    );
    res.json({ chatbot });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to update chatbot",
    });
  }
}

export async function deleteChatbot(req: Request, res: Response): Promise<void> {
  try {
    await chatbotService.deleteChatbot(req.params.chatbotId as string, req.user!.userId);
    res.json({ message: "Chatbot deleted" });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to delete chatbot",
    });
  }
}

export async function regenerateChatbotToken(req: Request, res: Response): Promise<void> {
  try {
    const publicToken = await chatbotService.regenerateToken(
      req.params.chatbotId as string,
      req.user!.userId
    );
    res.json({ publicToken });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to regenerate token",
    });
  }
}

export async function uploadChatbotFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }
    const chatbot = await chatbotService.uploadFile(
      req.params.chatbotId as string,
      req.user!.userId,
      {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      }
    );
    res.status(201).json({ chatbot });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to upload file",
    });
  }
}

export async function deleteChatbotFile(req: Request, res: Response): Promise<void> {
  try {
    const chatbot = await chatbotService.deleteFile(
      req.params.chatbotId as string,
      req.user!.userId,
      req.params.fileName as string
    );
    res.json({ chatbot });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to delete file",
    });
  }
}
