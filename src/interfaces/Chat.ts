import { Types } from "mongoose";

export interface IChat {
  authorId: Types.ObjectId;
  title: string;
  model: string;
  assistantId?: Types.ObjectId | null;
  chatbotId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
