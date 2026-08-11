import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { IWorkflowEdge } from "../../interfaces/WorkflowEdge";

export interface GraphNode {
  node: IWorkflowNode;
  incomingEdges: IWorkflowEdge[];
  outgoingEdges: IWorkflowEdge[];
  remainingDependencies: number;
}

export class DependencyGraph {
  readonly nodesById: Map<number, GraphNode> = new Map();
  readonly entryNodeIds: number[] = [];

  constructor(nodes: IWorkflowNode[], edges: IWorkflowEdge[]) {
    this.build(nodes, edges);
  }

  private build(nodes: IWorkflowNode[], edges: IWorkflowEdge[]): void {
    for (const node of nodes) {
      this.nodesById.set(node.id, {
        node,
        incomingEdges: [],
        outgoingEdges: [],
        remainingDependencies: 0,
      });
    }

    for (const edge of edges) {
      const source = this.nodesById.get(edge.sourceNodeId);
      const target = this.nodesById.get(edge.targetNodeId);

      if (source) {
        source.outgoingEdges.push(edge);
      }
      if (target) {
        target.incomingEdges.push(edge);
        target.remainingDependencies++;
      }
    }

    for (const [id, graphNode] of this.nodesById) {
      if (graphNode.remainingDependencies === 0) {
        this.entryNodeIds.push(id);
      }
    }
  }

  getNode(nodeId: number): GraphNode | undefined {
    return this.nodesById.get(nodeId);
  }

  hasNode(nodeId: number): boolean {
    return this.nodesById.has(nodeId);
  }

  get size(): number {
    return this.nodesById.size;
  }
}
