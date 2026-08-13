import { Types } from "mongoose";

export interface IAssistantFile {
  key: string;
  name: string;
  type: string;
  size: number;
}

export interface IAssistant {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  name: string;
  systemPrompt: string;
  model: string;
  files: IAssistantFile[];
  createdAt: Date;
  updatedAt: Date;
}
