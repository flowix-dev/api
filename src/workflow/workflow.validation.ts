import { IWorkflowNode } from "../interfaces/WorkflowNode";
import { IWorkflowEdge } from "../interfaces/WorkflowEdge";

export interface ValidationError {
  field: string;
  message: string;
}

export function validateWorkflowGraph(
  nodes: IWorkflowNode[],
  edges: IWorkflowEdge[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (nodes.length === 0) {
    errors.push({ field: "nodes", message: "Workflow must have at least one node" });
    return errors;
  }

  const nodeIds = new Set<number>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({ field: "nodes", message: `Duplicate node id: ${node.id}` });
    }
    nodeIds.add(node.id);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId)) {
      errors.push({
        field: "edges",
        message: `Edge references non-existent source node: ${edge.sourceNodeId}`,
      });
    }
    if (!nodeIds.has(edge.targetNodeId)) {
      errors.push({
        field: "edges",
        message: `Edge references non-existent target node: ${edge.targetNodeId}`,
      });
    }
    if (edge.sourceNodeId === edge.targetNodeId) {
      errors.push({
        field: "edges",
        message: `Self-referencing edge on node: ${edge.sourceNodeId}`,
      });
    }
  }

  const visited = new Set<number>();
  const inStack = new Set<number>();
  const adjacency = new Map<number, number[]>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId);
  }

  function hasCycle(nodeId: number): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adjacency.get(nodeId) || []) {
      if (hasCycle(neighbor)) return true;
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && hasCycle(node.id)) {
      errors.push({
        field: "edges",
        message: "Workflow contains a cycle",
      });
      break;
    }
  }

  return errors;
}
