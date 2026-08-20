import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { IWorkflowEdge } from "../../interfaces/WorkflowEdge";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { Workflow } from "../../models/Workflow";

export class EditWorkflowExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    if (!context?.userId) {
      throw new Error("No se pudo resolver el usuario");
    }

    const rawWorkflowId = String(inputs.workflowId ?? "").trim();
    if (!rawWorkflowId) {
      throw new Error("workflowId es requerido");
    }

    const workflow = await Workflow.findOne({
      _id: rawWorkflowId,
      authorId: context.userId,
    });

    if (!workflow) {
      throw new Error(`No se encontró el workflow "${rawWorkflowId}" para este usuario`);
    }

    const update: Record<string, unknown> = {};

    if (inputs.name !== undefined) {
      const name = String(inputs.name ?? "").trim();
      if (name) {
        update.name = name;
      }
    }

    if (inputs.nodes !== undefined) {
      let nodes = inputs.nodes;
      if (typeof nodes === "string") {
        try {
          nodes = JSON.parse(nodes);
        } catch {
          throw new Error("nodes debe ser un JSON válido");
        }
      }
      if (!Array.isArray(nodes)) {
        throw new Error("nodes debe ser un array");
      }
      update.nodes = nodes as IWorkflowNode[];
    }

    if (inputs.edges !== undefined) {
      let edges = inputs.edges;
      if (typeof edges === "string") {
        try {
          edges = JSON.parse(edges);
        } catch {
          throw new Error("edges debe ser un JSON válido");
        }
      }
      if (!Array.isArray(edges)) {
        throw new Error("edges debe ser un array");
      }
      update.edges = edges as IWorkflowEdge[];
    }

    if (Object.keys(update).length === 0) {
      throw new Error("Al menos uno de name, nodes o edges debe ser proporcionado");
    }

    const updated = await Workflow.findOneAndUpdate(
      { _id: rawWorkflowId, authorId: context.userId },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!updated) {
      throw new Error("No se pudo actualizar el workflow");
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    return {
      outputs: {
        id: updated._id.toString(),
        url: `${frontendUrl}/workflows/${updated._id.toString()}`,
        name: updated.name,
        nodeCount: updated.nodes.length,
        edgeCount: updated.edges.length,
      },
    };
  }
}
