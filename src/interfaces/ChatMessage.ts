import { Types } from "mongoose";

export interface IAttachment {
  name: string;
  type: string;
  size: number;
  s3Key: string;
}

export interface IToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status: "completed" | "failed";
}

export type ChatMessageRole = "user" | "assistant";

export interface IChatMessage {
  chatId: Types.ObjectId;
  authorId: Types.ObjectId;
  role: ChatMessageRole;
  content: string;
  attachments: IAttachment[];
  toolCalls: IToolCall[];
  createdAt: Date;
}
