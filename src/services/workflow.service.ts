import { Workflow } from "../models/Workflow";
import { WorkflowExecution } from "../models/WorkflowExecution";
import { IWorkflowExecution } from "../interfaces/WorkflowExecution";
import { User } from "../models/User";
import { NodeDefinition } from "../models/NodeDefinition";
import { WorkflowRunner } from "../workflow/execution/WorkflowRunner";
import { UploadedFile } from "../workflow/execution/ExecutionContext";
import { validateWorkflowGraph } from "../workflow/workflow.validation";
import { IWorkflowNode } from "../interfaces/WorkflowNode";
import { IWorkflowEdge } from "../interfaces/WorkflowEdge";

export class WorkflowService {
  private readonly runner = new WorkflowRunner();

  get events() {
    return this.runner.events;
  }

  async runWorkflow(workflowId: string, userId: string, uploadedFile?: UploadedFile) {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const errors = validateWorkflowGraph(workflow.nodes, workflow.edges);
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed: ${errors.map((e) => e.message).join(", ")}`);
    }

    const user = await User.findById(userId).select("puterToken").lean();
    const execution = await this.runner.runWorkflow(workflowId, userId, {
      uploadedFile,
      puterToken: user?.puterToken ?? undefined,
    });

    return execution;
  }

  async runWebhookWorkflow(workflowId: string, triggerData: unknown) {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const definitions = await NodeDefinition.find({
      _id: { $in: workflow.nodes.map((node) => node.nodeDefinitionId) },
    });
    if (!definitions.some((def) => def.fnKey === "webhook.trigger")) {
      throw new Error("Workflow does not expose a webhook trigger");
    }

    const errors = validateWorkflowGraph(workflow.nodes, workflow.edges);
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed: ${errors.map((e) => e.message).join(", ")}`);
    }

    const user = await User.findById(workflow.authorId).select("puterToken").lean();
    const execution = await this.runner.runWorkflow(workflowId, workflow.authorId.toString(), {
      puterToken: user?.puterToken ?? undefined,
      triggerData,
    });

    return execution;
  }

  async getExecution(executionId: string) {
    const execution = await WorkflowExecution.findById(executionId)
      .populate("workflowId", "name")
      .populate("triggeredBy", "firstName lastName email");
    if (!execution) {
      throw new Error("Execution not found");
    }
    return execution;
  }

  async getWorkflowExecutions(workflowId: string, userId: string, page = 1, limit = 20) {
    const workflow = await Workflow.findOne({ _id: workflowId, authorId: userId });
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const skip = (page - 1) * limit;
    const [executions, total] = await Promise.all([
      WorkflowExecution.find({ workflowId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("triggeredBy", "firstName lastName email"),
      WorkflowExecution.countDocuments({ workflowId }),
    ]);

    return { executions, total, page, limit };
  }

  async getUserExecutions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [executions, total] = await Promise.all([
      WorkflowExecution.find({ triggeredBy: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("workflowId", "name"),
      WorkflowExecution.countDocuments({ triggeredBy: userId }),
    ]);

    return { executions, total, page, limit };
  }
  async listWorkflows(userId: string, page = 1, limit = 20) {
    const filter = { authorId: userId, parentWorkflowId: null };
    const skip = (page - 1) * limit;
    const [workflows, total] = await Promise.all([
      Workflow.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Workflow.countDocuments(filter),
    ]);
    return { workflows, total, page, limit };
  }

  async getWorkflow(workflowId: string, userId?: string) {
    const filter: Record<string, unknown> = { _id: workflowId };
    if (userId) {
      filter.authorId = userId;
    }
    const workflow = await Workflow.findOne(filter);
    if (!workflow) {
      throw new Error("Workflow not found");
    }
    return workflow;
  }

  async createWorkflow(
    data: {
      name: string;
      nodes?: IWorkflowNode[];
      edges?: IWorkflowEdge[];
      parentWorkflowId?: string;
    },
    userId: string
  ) {
    const workflow = await Workflow.create({
      name: data.name,
      authorId: userId,
      parentWorkflowId: data.parentWorkflowId || undefined,
      nodes: data.nodes || [],
      edges: data.edges || [],
    });
    return workflow;
  }

  async runChildWorkflow(
    workflowId: string,
    userId: string,
    childInputs: Record<string, unknown>,
    options: { uploadedFile?: UploadedFile; puterToken?: string | null } = {}
  ): Promise<IWorkflowExecution> {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error("Workflow hijo no encontrado");
    }

    const errors = validateWorkflowGraph(workflow.nodes, workflow.edges);
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed: ${errors.map((e) => e.message).join(", ")}`);
    }

    return this.runner.runWorkflowAndWait(workflowId, userId, {
      uploadedFile: options.uploadedFile,
      puterToken: options.puterToken,
      childInputs,
    });
  }

  async updateWorkflow(
    workflowId: string,
    userId: string,
    data: { name?: string; nodes?: IWorkflowNode[]; edges?: IWorkflowEdge[] }
  ) {
    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, authorId: userId },
      { $set: data },
      { new: true }
    );
    if (!workflow) {
      throw new Error("Workflow not found");
    }
    return workflow;
  }

  async deleteWorkflow(workflowId: string, userId: string) {
    const workflow = await Workflow.findOneAndDelete({ _id: workflowId, authorId: userId });
    if (!workflow) {
      throw new Error("Workflow not found");
    }
  }
}

export const workflowService = new WorkflowService();
