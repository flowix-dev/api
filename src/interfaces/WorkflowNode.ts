import { Types } from "mongoose";

export interface IWorkflowNode {
  id: number;
  nodeDefinitionId: Types.ObjectId;
  name?: string;
  disabled: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  userInputs: Record<string, unknown>;
}

export interface IWorkflowNodeMethods {}

export interface IWorkflowNodeVirtuals {}

export type WorkflowNodeDocument = IWorkflowNode & IWorkflowNodeMethods & IWorkflowNodeVirtuals;
