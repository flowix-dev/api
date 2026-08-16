import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { Workflow } from "../../models/Workflow";

export class ListWorkflowsExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    if (!context?.userId) {
      throw new Error("No se pudo resolver el usuario");
    }

    const search = String(inputs.search ?? "").trim();
    const limitRaw = Number(inputs.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.trunc(limitRaw)), 200) : 50;
    const includeChildren = Boolean(inputs.includeChildren);

    const filter: Record<string, unknown> = {
      authorId: context.userId,
      parentWorkflowId: includeChildren ? { $exists: true } : null,
    };

    if (search) {
      filter.name = new RegExp(search, "i");
    }

    const workflows = await Workflow.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("name _id parentWorkflowId updatedAt createdAt")
      .lean();

    return {
      outputs: {
        workflows: workflows.map((wf) => ({
          workflowId: wf._id.toString(),
          name: wf.name,
          parentWorkflowId: wf.parentWorkflowId ? wf.parentWorkflowId.toString() : null,
          updatedAt: wf.updatedAt,
          createdAt: wf.createdAt,
        })),
        count: workflows.length,
      },
    };
  }
}
