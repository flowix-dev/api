import { Request, Response } from "express";
import { assistantService } from "../services/assistant.service";

export async function listAssistants(req: Request, res: Response): Promise<void> {
  try {
    const assistants = await assistantService.listAssistants(req.user!.userId);
    res.json({ assistants });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to list assistants",
    });
  }
}

export async function createAssistant(req: Request, res: Response): Promise<void> {
  try {
    const { name, systemPrompt, model } = req.body as {
      name?: string;
      systemPrompt?: string;
      model?: string;
    };
    if (!name || !name.trim() || !systemPrompt || !systemPrompt.trim()) {
      res.status(400).json({ message: "Name and system prompt are required" });
      return;
    }
    const assistant = await assistantService.createAssistant(req.user!.userId, {
      name,
      systemPrompt,
      model,
    });
    res.status(201).json({ assistant });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to create assistant",
    });
  }
}

export async function getAssistant(req: Request, res: Response): Promise<void> {
  try {
    const assistant = await assistantService.getAssistant(
      req.params.assistantId as string,
      req.user!.userId
    );
    res.json({ assistant });
  } catch (error: unknown) {
    res.status(404).json({
      message: error instanceof Error ? error.message : "Failed to get assistant",
    });
  }
}

export async function updateAssistant(req: Request, res: Response): Promise<void> {
  try {
    const { name, systemPrompt, model } = req.body as {
      name?: string;
      systemPrompt?: string;
      model?: string;
    };
    const assistant = await assistantService.updateAssistant(
      req.params.assistantId as string,
      req.user!.userId,
      { name, systemPrompt, model }
    );
    res.json({ assistant });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to update assistant",
    });
  }
}

export async function deleteAssistant(req: Request, res: Response): Promise<void> {
  try {
    await assistantService.deleteAssistant(req.params.assistantId as string, req.user!.userId);
    res.json({ message: "Assistant deleted" });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to delete assistant",
    });
  }
}

export async function uploadAssistantFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }
    const assistant = await assistantService.uploadFile(
      req.params.assistantId as string,
      req.user!.userId,
      {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      }
    );
    res.status(201).json({ assistant });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to upload file",
    });
  }
}

export async function deleteAssistantFile(req: Request, res: Response): Promise<void> {
  try {
    const assistant = await assistantService.deleteFile(
      req.params.assistantId as string,
      req.user!.userId,
      req.params.fileName as string
    );
    res.json({ assistant });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to delete file",
    });
  }
}
