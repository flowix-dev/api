import { Types } from "mongoose";
import { IWorkflowNode } from "./WorkflowNode";
import { IWorkflowEdge } from "./WorkflowEdge";

export interface IWorkflow {
  name: string;
  authorId: Types.ObjectId;
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  createdAt: Date;
  updatedAt: Date;
}
