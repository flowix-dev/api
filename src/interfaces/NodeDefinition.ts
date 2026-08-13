import { Types } from "mongoose";
import { INodePort } from "./NodePort";

export interface INodeDefinition {
  _id: Types.ObjectId;
  name: string;
  fnKey: string;
  category: string;
  version: number;
  isTool: boolean;
  inputs: INodePort[];
  outputs: INodePort[];
  createdAt: Date;
  updatedAt: Date;
}
