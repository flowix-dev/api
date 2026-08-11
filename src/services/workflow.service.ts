import { Workflow } from "../models/Workflow";
import { WorkflowExecution } from "../models/WorkflowExecution";
import { WorkflowRunner } from "../workflow/execution/WorkflowRunner";
import { validateWorkflowGraph } from "../workflow/workflow.validation";
import { IWorkflowNode } from "../interfaces/WorkflowNode";
import { IWorkflowEdge } from "../interfaces/WorkflowEdge";

export class WorkflowService {
  private readonly runner = new WorkflowRunner();

  get events() {
    return this.runner.events;
  }

  async runWorkflow(workflowId: string, userId: string) {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const errors = validateWorkflowGraph(workflow.nodes, workflow.edges);
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed: ${errors.map((e) => e.message).join(", ")}`);
    }

    const execution = await this.runner.runWorkflow(workflowId, userId);

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

  async getWorkflowExecutions(workflowId: string, page = 1, limit = 20) {
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
    const skip = (page - 1) * limit;
    const [workflows, total] = await Promise.all([
      Workflow.find({ authorId: userId }).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Workflow.countDocuments({ authorId: userId }),
    ]);
    return { workflows, total, page, limit };
  }

  async getWorkflow(workflowId: string) {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }
    return workflow;
  }

  async createWorkflow(
    data: { name: string; nodes?: IWorkflowNode[]; edges?: IWorkflowEdge[] },
    userId: string
  ) {
    const workflow = await Workflow.create({
      name: data.name,
      authorId: userId,
      nodes: data.nodes || [],
      edges: data.edges || [],
    });
    return workflow;
  }

  async updateWorkflow(
    workflowId: string,
    data: { name?: string; nodes?: IWorkflowNode[]; edges?: IWorkflowEdge[] }
  ) {
    const workflow = await Workflow.findByIdAndUpdate(workflowId, { $set: data }, { new: true });
    if (!workflow) {
      throw new Error("Workflow not found");
    }
    return workflow;
  }

  async deleteWorkflow(workflowId: string) {
    const workflow = await Workflow.findByIdAndDelete(workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }
  }
}

export const workflowService = new WorkflowService();
