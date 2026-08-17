import { Request, Response } from "express";
import { workflowChatService } from "../services/workflow-chat.service";

export class WorkflowChatController {
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const workflowId = req.params.workflowId as string;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const messages = await workflowChatService.getHistory(workflowId, userId);
      res.json({ messages });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get chat history";
      res.status(400).json({ message });
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const workflowId = req.params.workflowId as string;
      const { content } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (!content?.trim()) {
        res.status(400).json({ message: "Content is required" });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const sendEvent = (event: string, data: unknown): void => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const message = await workflowChatService.sendMessage(workflowId, userId, content.trim(), {
        onUserMessage: (msg) => {
          sendEvent("message.started", {
            _id: msg._id,
            role: msg.role,
            content: msg.content,
          });
        },
        onContentDelta: (delta) => {
          sendEvent("content.delta", { delta });
        },
        onToolStart: (call) => {
          sendEvent("tool.started", {
            id: call.id,
            name: call.name,
            arguments: call.arguments,
          });
        },
        onToolEnd: (call) => {
          sendEvent("tool.finished", {
            id: call.id,
            name: call.name,
            output: call.output,
            error: call.error,
            status: call.status,
          });
        },
        onAssistantMessage: (msg) => {
          sendEvent("message.completed", {
            _id: msg._id,
            role: msg.role,
            content: msg.content,
            toolCalls: msg.toolCalls,
          });
        },
        onWorkflowSwitched: (newWorkflowId) => {
          sendEvent("workflow.switched", { workflowId: newWorkflowId });
        },
      });

      sendEvent("done", { _id: message._id });
      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      res.status(400).json({ message });
    }
  }
}

export const workflowChatController = new WorkflowChatController();
