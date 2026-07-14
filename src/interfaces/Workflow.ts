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

export interface IWorkflowMethods {}

export interface IWorkflowVirtuals {}

export type WorkflowDocument = IWorkflow & IWorkflowMethods & IWorkflowVirtuals;
