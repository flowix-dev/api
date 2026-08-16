import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { IWorkflowEdge } from "../../interfaces/WorkflowEdge";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { Workflow } from "../../models/Workflow";

export class CreateWorkflowExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    if (!context?.userId) {
      throw new Error("No se pudo resolver el usuario");
    }

    const name = String(inputs.name ?? "").trim();
    if (!name) {
      throw new Error("name es requerido");
    }

    let nodes: unknown = inputs.nodes ?? [];
    let edges: unknown = inputs.edges ?? [];

    if (typeof nodes === "string") {
      try {
        nodes = JSON.parse(nodes);
      } catch {
        throw new Error("nodes debe ser un JSON válido");
      }
    }
    if (typeof edges === "string") {
      try {
        edges = JSON.parse(edges);
      } catch {
        throw new Error("edges debe ser un JSON válido");
      }
    }

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      throw new Error("nodes y edges deben ser arrays");
    }

    const workflow = await Workflow.create({
      name,
      authorId: context.userId,
      parentWorkflowId: undefined,
      nodes: nodes as IWorkflowNode[],
      edges: edges as IWorkflowEdge[],
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    return {
      outputs: {
        id: workflow._id.toString(),
        url: `${frontendUrl}/workflows/${workflow._id.toString()}`,
        name: workflow.name,
      },
    };
  }
}
