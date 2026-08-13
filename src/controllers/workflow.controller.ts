import { Request, Response } from "express";
import { workflowService } from "../services/workflow.service";
import { IWorkflowNode } from "../interfaces/WorkflowNode";
import { IWorkflowEdge } from "../interfaces/WorkflowEdge";
import { getWorkflowFileByKey } from "../utils/fileStorage";

export async function listWorkflows(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await workflowService.listWorkflows(userId, page, limit);

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list workflows";
    res.status(400).json({ message });
  }
}

export async function getWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const workflowId = req.params.workflowId as string;

    const workflow = await workflowService.getWorkflow(workflowId);

    res.json({ workflow });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get workflow";
    res.status(404).json({ message });
  }
}

export async function createWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { name, nodes, edges } = req.body as {
      name: string;
      nodes?: IWorkflowNode[];
      edges?: IWorkflowEdge[];
    };

    const workflow = await workflowService.createWorkflow({ name, nodes, edges }, userId);

    res.status(201).json({ workflow });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create workflow";
    res.status(400).json({ message });
  }
}

export async function updateWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const workflowId = req.params.workflowId as string;
    const { name, nodes, edges } = req.body as {
      name?: string;
      nodes?: IWorkflowNode[];
      edges?: IWorkflowEdge[];
    };

    const workflow = await workflowService.updateWorkflow(workflowId, { name, nodes, edges });

    res.json({ workflow });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update workflow";
    res.status(400).json({ message });
  }
}

export async function deleteWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const workflowId = req.params.workflowId as string;

    await workflowService.deleteWorkflow(workflowId);

    res.json({ message: "Workflow deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete workflow";
    res.status(400).json({ message });
  }
}

export async function runWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const workflowId = req.params.workflowId as string;
    const userId = req.user!.userId;

    const file = req.file;
    const execution = await workflowService.runWorkflow(
      workflowId,
      userId,
      file
        ? {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          }
        : undefined
    );

    res.status(202).json({
      message: "Workflow execution started",
      execution: {
        _id: execution._id,
        status: execution.status,
        startedAt: execution.startedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to run workflow";
    res.status(400).json({ message });
  }
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  try {
    const raw = req.params.key;
    const key = (Array.isArray(raw) ? raw.join("/") : raw).replace(/^\/+/, "");
    const file = await getWorkflowFileByKey(key);

    if (file.contentType) {
      res.setHeader("Content-Type", file.contentType);
    }
    if (file.name) {
      res.setHeader("Content-Disposition", `inline; filename="${file.name.replace(/["\\]/g, "")}"`);
    }
    res.send(file.body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to download file";
    res.status(404).json({ message });
  }
}

export async function getExecution(req: Request, res: Response): Promise<void> {
  try {
    const executionId = req.params.executionId as string;
    const execution = await workflowService.getExecution(executionId);

    res.json({ execution });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get execution";
    res.status(404).json({ message });
  }
}

export async function getWorkflowExecutions(req: Request, res: Response): Promise<void> {
  try {
    const workflowId = req.params.workflowId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await workflowService.getWorkflowExecutions(workflowId, page, limit);

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get executions";
    res.status(400).json({ message });
  }
}

export async function getUserExecutions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await workflowService.getUserExecutions(userId, page, limit);

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get executions";
    res.status(400).json({ message });
  }
}
