import { NodeDataType } from "../types/NodeDataType";

export interface INodePort {
  key: string;
  type: NodeDataType;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface INodePortMethods {}

export interface INodePortVirtuals {}

export type NodePortDocument = INodePort & INodePortMethods & INodePortVirtuals;
