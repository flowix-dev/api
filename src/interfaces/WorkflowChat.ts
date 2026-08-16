import { Types } from "mongoose";

export interface IWorkflowChatToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status: "completed" | "failed";
}

export interface IWorkflowChatMessage {
  _id: Types.ObjectId;
  workflowId: Types.ObjectId;
  authorId: Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  toolCalls: IWorkflowChatToolCall[];
  createdAt: Date;
  updatedAt: Date;
}
