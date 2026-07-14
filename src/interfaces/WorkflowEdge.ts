export interface IWorkflowEdge {
  sourceNodeId: number;
  sourceKey: string;
  targetNodeId: number;
  targetKey: string;
}

export interface IWorkflowEdgeMethods {}

export interface IWorkflowEdgeVirtuals {}

export type WorkflowEdgeDocument = IWorkflowEdge & IWorkflowEdgeMethods & IWorkflowEdgeVirtuals;
