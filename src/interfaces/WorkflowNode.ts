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
  inputs: Record<string, unknown>;
}
