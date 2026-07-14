import { INodePort } from "./NodePort";

export interface INodeDefinition {
  name: string;
  fnKey: string;
  category: string;
  version: number;
  inputs: INodePort[];
  outputs: INodePort[];
  createdAt: Date;
  updatedAt: Date;
}

export interface INodeDefinitionMethods {}

export interface INodeDefinitionVirtuals {}

export type NodeDefinitionDocument = INodeDefinition &
  INodeDefinitionMethods &
  INodeDefinitionVirtuals;
